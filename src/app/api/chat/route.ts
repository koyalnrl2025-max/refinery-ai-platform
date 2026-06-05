import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are RefineIQ, an AI-powered assistant for refinery operations. You have expert knowledge of:
- Crude distillation, FCC, hydroprocessing, catalytic reforming
- Safety & HSE procedures, hot work permits, emergency shutdowns
- Maintenance planning, work orders, predictive maintenance
- Laboratory testing, product specifications, ASTM standards
- Utilities & energy management, steam balance, power generation
- Planning & scheduling, turnaround management, LP optimization

When answering:
- Be precise, technical, and cite relevant engineering standards (API, OSHA, IEC, ASTM) where applicable
- Structure answers clearly with bullet points or numbered steps for procedures
- Flag safety-critical information prominently
- If you reference a document, note it in the format [Doc: <name>, p.<page>]
- Keep responses concise but complete for the operational context`;

type Provider = 'ollama' | 'anthropic' | 'openai';

interface StreamResult {
  stream: AsyncIterable<string>;
  provider: Provider;
  modelId: string;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// ── Ollama via its OpenAI-compatible endpoint ─────────────────────────────────
async function tryOllama(messages: ChatMessage[], modelId: string): Promise<StreamResult> {
  const baseURL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  const client = new OpenAI({ baseURL: `${baseURL}/v1`, apiKey: 'ollama' });

  // Test connectivity before committing — Ollama rejects unknown models fast
  const streamResponse = await client.chat.completions.create({
    model: modelId,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    stream: true,
    temperature: 0.3,
  });

  async function* generate(): AsyncIterable<string> {
    for await (const chunk of streamResponse) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) yield text;
    }
  }

  return { stream: generate(), provider: 'ollama', modelId };
}

// ── Anthropic ─────────────────────────────────────────────────────────────────
async function tryAnthropic(messages: ChatMessage[], modelId: string): Promise<StreamResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const streamResponse = client.messages.stream({
    model: modelId,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  async function* generate(): AsyncIterable<string> {
    for await (const chunk of streamResponse) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  return { stream: generate(), provider: 'anthropic', modelId };
}

// ── OpenAI ────────────────────────────────────────────────────────────────────
async function tryOpenAI(messages: ChatMessage[], modelId: string): Promise<StreamResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const streamResponse = await client.chat.completions.create({
    model: modelId,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    stream: true,
    temperature: 0.3,
  });

  async function* generate(): AsyncIterable<string> {
    for await (const chunk of streamResponse) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) yield text;
    }
  }

  return { stream: generate(), provider: 'openai', modelId };
}

// ── Fallback chain ────────────────────────────────────────────────────────────
async function getStream(messages: ChatMessage[]): Promise<StreamResult> {
  const providers: { provider: Provider; modelId: string; fn: (m: ChatMessage[], id: string) => Promise<StreamResult> }[] = [
    { provider: 'ollama',    modelId: 'llama3.2:3b',         fn: tryOllama    },
    { provider: 'anthropic', modelId: 'claude-sonnet-4-6',   fn: tryAnthropic },
    { provider: 'openai',    modelId: 'gpt-4o',              fn: tryOpenAI    },
  ];

  const errors: string[] = [];

  for (const { provider, modelId, fn } of providers) {
    try {
      const result = await fn(messages, modelId);
      console.log(`[chat] using provider: ${provider} (${modelId})`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[chat] ${provider} unavailable: ${msg}`);
      errors.push(`${provider}: ${msg}`);
    }
  }

  throw new Error(`All providers failed:\n${errors.join('\n')}`);
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { message, conversationId, dept } = await request.json();
  if (!message) return new Response('Message required', { status: 400 });

  const startMs = Date.now();

  // Load conversation history (last 10 exchanges = 20 messages)
  let history: ChatMessage[] = [];
  if (conversationId) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (msgs) {
      history = msgs.map((m: { role: string; content: string }) => ({
        role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      }));
    }
  }

  const deptPrefix = dept && dept !== 'all'
    ? `[Context: ${dept.toUpperCase()} department]\n\n`
    : '';

  const messagesForLLM: ChatMessage[] = [
    ...history,
    { role: 'user', content: deptPrefix + message },
  ];

  const encoder = new TextEncoder();
  let newConvId = conversationId;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Create conversation row if this is a new chat
        if (!newConvId) {
          const title = message.length > 50 ? message.slice(0, 50) + '…' : message;
          const { data: conv } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title, dept: dept ?? 'all' })
            .select('id')
            .single();
          newConvId = conv?.id ?? null;
        }

        // Save user message immediately
        if (newConvId) {
          await supabase.from('messages').insert({
            conversation_id: newConvId,
            user_id: user.id,
            role: 'user',
            content: message,
          });
        }

        // Send conversation ID to client
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'conv_id', id: newConvId })}\n\n`
        ));

        // Get stream from the first available provider
        const { stream: llmStream, provider, modelId } = await getStream(messagesForLLM);

        // Tell client which model is responding
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'model', provider, modelId })}\n\n`
        ));

        // Stream tokens to client
        let fullContent = '';
        for await (const text of llmStream) {
          fullContent += text;
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'delta', text })}\n\n`
          ));
        }

        const responseMs = Date.now() - startMs;

        // Extract [Doc: ..., p.xx] citations from content
        const citationRegex = /\[Doc:\s*([^,\]]+),?\s*(?:p\.(\S+))?\]/g;
        const citations: { doc: string; page: string }[] = [];
        let match;
        while ((match = citationRegex.exec(fullContent)) !== null) {
          citations.push({ doc: match[1].trim(), page: match[2] ? `p.${match[2]}` : '' });
        }

        // Simple sentiment heuristic on the user query
        const lower = message.toLowerCase();
        const negWords = ['error', 'fault', 'fail', 'problem', 'danger', 'critical', 'alarm', 'trip', 'emergency'];
        const posWords = ['optimal', 'normal', 'good', 'recommend', 'efficient', 'improve', 'success'];
        const sentiment = negWords.some(w => lower.includes(w)) ? 'neg'
          : posWords.some(w => lower.includes(w)) ? 'pos' : 'neu';

        // Persist AI message
        if (newConvId) {
          await supabase.from('messages').insert({
            conversation_id: newConvId,
            user_id: user.id,
            role: 'ai',
            content: fullContent,
            citations,
            sentiment,
            response_ms: responseMs,
          });
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', newConvId);
        }

        // Increment stats
        await supabase.rpc('increment_user_queries', { uid: user.id });

        // Audit log (records which provider was actually used)
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_name: user.email,
          action: 'Query submitted',
          resource: 'Chat session',
          metadata: { dept, provider, modelId, response_ms: responseMs },
        });

        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'done', citations, sentiment, responseMs, provider, modelId })}\n\n`
        ));
        controller.close();

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[chat] fatal:', msg);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', message: 'All AI providers are currently unavailable. Please try again later.' })}\n\n`
        ));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
