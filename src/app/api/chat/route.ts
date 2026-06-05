import { createClient } from '@/lib/supabase/server';
import { embedText } from '@/lib/embeddings';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are RefineIQ, an AI assistant for a refinery organisation.
Your PRIMARY source of truth is the DOCUMENT CONTEXT block below.

Rules:
1. Answer ONLY from the provided context when it contains relevant information.
2. Quote or paraphrase the source — always end with a citation like [Doc: <filename>, chunk <n>].
3. If the context does not cover the question, say clearly: "I couldn't find this in the uploaded documents." Then you may briefly supplement with general knowledge, but flag it as such.
4. Never fabricate policy numbers, dates, or names.
5. Be concise and structured. Use bullet points for lists.`;

type Provider = 'ollama' | 'anthropic' | 'openai';
type ChatMsg  = { role: 'user' | 'assistant'; content: string };

// ── RAG retrieval ─────────────────────────────────────────────────────────────
async function retrieveContext(
  query: string,
  dept: string | null,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ contextBlock: string; sources: { doc: string; page: string }[] }> {
  try {
    const queryEmbedding = await embedText(query);

    const { data: chunks, error } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_count:     5,
      match_threshold: 0.25,
      dept_filter:     (dept && dept !== 'all') ? dept : null,
    });

    if (error) throw new Error(error.message);
    if (!chunks?.length) return { contextBlock: '', sources: [] };

    const contextBlock = (chunks as {
      document_name: string; chunk_index: number; content: string; similarity: number;
    }[]).map((c, i) =>
      `[${i + 1}] Source: ${c.document_name}, chunk ${c.chunk_index} (similarity ${(c.similarity * 100).toFixed(0)}%)\n${c.content}`
    ).join('\n\n---\n\n');

    const sources = (chunks as { document_name: string; chunk_index: number }[]).map(c => ({
      doc:  c.document_name,
      page: `chunk ${c.chunk_index}`,
    }));

    return { contextBlock, sources };
  } catch (err) {
    console.warn('[RAG] retrieval failed, proceeding without context:', (err as Error).message);
    return { contextBlock: '', sources: [] };
  }
}

// ── LLM provider helpers ──────────────────────────────────────────────────────
async function* tryOllama(messages: ChatMsg[], modelId: string): AsyncIterable<string> {
  const baseURL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  const client  = new OpenAI({ baseURL: `${baseURL}/v1`, apiKey: 'ollama' });
  const stream  = await client.chat.completions.create({
    model: modelId, messages, stream: true, temperature: 0.2,
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) yield text;
  }
}

async function* tryAnthropic(messages: ChatMsg[], systemPrompt: string, modelId: string): AsyncIterable<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = client.messages.stream({
    model: modelId, max_tokens: 1024, system: systemPrompt, messages,
  });
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta')
      yield chunk.delta.text;
  }
}

async function* tryOpenAI(messages: ChatMsg[], modelId: string): AsyncIterable<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const stream = await client.chat.completions.create({
    model: modelId, messages, stream: true, temperature: 0.2,
  });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content ?? '';
    if (text) yield text;
  }
}

interface StreamResult { stream: AsyncIterable<string>; provider: Provider; modelId: string }

async function getStream(
  userMessages: ChatMsg[],
  systemWithContext: string
): Promise<StreamResult> {
  // Prepend system message for Ollama/OpenAI (they take it inside messages array)
  const withSystem: ChatMsg[] = [
    { role: 'user',      content: systemWithContext + '\n\nPlease acknowledge you have read the context and are ready to answer.' },
    { role: 'assistant', content: 'Understood. I have read the provided document context and will answer primarily from it.' },
    ...userMessages,
  ];

  const errors: string[] = [];

  try {
    return { stream: tryOllama(withSystem, 'llama3.2:3b'), provider: 'ollama', modelId: 'llama3.2:3b' };
  } catch (e) { errors.push(`ollama: ${(e as Error).message}`); }

  try {
    return { stream: tryAnthropic(userMessages, systemWithContext, 'claude-sonnet-4-6'), provider: 'anthropic', modelId: 'claude-sonnet-4-6' };
  } catch (e) { errors.push(`anthropic: ${(e as Error).message}`); }

  try {
    return { stream: tryOpenAI(withSystem, 'gpt-4o'), provider: 'openai', modelId: 'gpt-4o' };
  } catch (e) { errors.push(`openai: ${(e as Error).message}`); }

  throw new Error('All providers failed:\n' + errors.join('\n'));
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { message, conversationId, dept } = await request.json();
  if (!message) return new Response('Message required', { status: 400 });

  const startMs = Date.now();

  // Load conversation history
  let history: ChatMsg[] = [];
  if (conversationId) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(10);

    if (msgs) {
      history = msgs.map((m: { role: string; content: string }) => ({
        role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      }));
    }
  }

  // ── RAG: retrieve relevant document chunks ──────────────────────────────
  const { contextBlock, sources } = await retrieveContext(message, dept ?? null, supabase);

  // Build system prompt — inject context if found
  const systemWithContext = contextBlock
    ? `${SYSTEM_PROMPT}\n\n${'─'.repeat(60)}\nDOCUMENT CONTEXT:\n\n${contextBlock}\n${'─'.repeat(60)}`
    : `${SYSTEM_PROMPT}\n\n(No relevant documents found in the knowledge base for this query.)`;

  const messagesForLLM: ChatMsg[] = [
    ...history,
    { role: 'user', content: message },
  ];

  const encoder   = new TextEncoder();
  let newConvId   = conversationId;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      try {
        // Create conversation if new
        if (!newConvId) {
          const title = message.length > 50 ? message.slice(0, 50) + '…' : message;
          const { data: conv } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title, dept: dept ?? 'all' })
            .select('id').single();
          newConvId = conv?.id ?? null;
        }

        // Save user message
        if (newConvId) {
          await supabase.from('messages').insert({
            conversation_id: newConvId, user_id: user.id, role: 'user', content: message,
          });
        }

        send({ type: 'conv_id', id: newConvId });

        // Tell client how many context chunks were found
        send({ type: 'context', chunks: sources.length, hasDocs: sources.length > 0 });

        // Stream from LLM
        const { stream: llmStream, provider, modelId } = await getStream(messagesForLLM, systemWithContext);
        send({ type: 'model', provider, modelId });

        let fullContent = '';
        for await (const text of llmStream) {
          fullContent += text;
          send({ type: 'delta', text });
        }

        const responseMs = Date.now() - startMs;

        // Merge RAG sources with any inline [Doc: ...] citations
        const inlineRegex = /\[Doc:\s*([^,\]]+),?\s*(?:p\.(\S+))?\]/g;
        const allCitations = [...sources];
        let m;
        while ((m = inlineRegex.exec(fullContent)) !== null) {
          if (!allCitations.some(c => c.doc === m![1].trim())) {
            allCitations.push({ doc: m[1].trim(), page: m[2] ? `p.${m[2]}` : '' });
          }
        }

        const lower = message.toLowerCase();
        const negWords = ['error','fault','fail','problem','danger','critical','alarm','trip','emergency'];
        const posWords = ['optimal','normal','good','recommend','efficient','improve','success'];
        const sentiment = negWords.some(w => lower.includes(w)) ? 'neg'
          : posWords.some(w => lower.includes(w)) ? 'pos' : 'neu';

        if (newConvId) {
          await supabase.from('messages').insert({
            conversation_id: newConvId, user_id: user.id, role: 'ai',
            content: fullContent, citations: allCitations, sentiment, response_ms: responseMs,
          });
          await supabase.from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', newConvId);
        }

        await supabase.rpc('increment_user_queries', { uid: user.id });

        await supabase.from('audit_logs').insert({
          user_id: user.id, user_name: user.email,
          action: 'Query submitted', resource: 'Chat session',
          metadata: { dept, provider, modelId, rag_chunks: sources.length, response_ms: responseMs },
        });

        send({ type: 'done', citations: allCitations, sentiment, responseMs, provider, modelId });
        controller.close();

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[chat] fatal:', msg);
        send({ type: 'error', message: 'All AI providers are currently unavailable. Please try again later.' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
