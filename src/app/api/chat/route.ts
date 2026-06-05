import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { message, conversationId, dept } = await request.json();
  if (!message) return new Response('Message required', { status: 400 });

  const startMs = Date.now();

  // Load conversation history (last 10 messages for context)
  let history: { role: 'user' | 'assistant'; content: string }[] = [];
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

  // Department context prefix
  const deptContext = dept && dept !== 'all'
    ? `[Context: User is querying the ${dept.toUpperCase()} department]\n\n`
    : '';

  const encoder = new TextEncoder();
  let fullContent = '';
  let newConvId = conversationId;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Create conversation if new
        if (!conversationId) {
          const title = message.length > 50 ? message.slice(0, 50) + '…' : message;
          const { data: conv } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title, dept: dept ?? 'all' })
            .select('id')
            .single();
          newConvId = conv?.id;
        }

        // Save user message
        if (newConvId) {
          await supabase.from('messages').insert({
            conversation_id: newConvId,
            user_id: user.id,
            role: 'user',
            content: message,
          });
        }

        // Stream from Anthropic
        const stream = await anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            ...history,
            { role: 'user', content: deptContext + message },
          ],
        });

        // Send conversation ID first so client can capture it
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'conv_id', id: newConvId })}\n\n`));

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text;
            fullContent += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`));
          }
        }

        const responseMs = Date.now() - startMs;

        // Extract inline citations from content
        const citationRegex = /\[Doc:\s*([^,\]]+),?\s*(?:p\.(\S+))?\]/g;
        const citations: { doc: string; page: string }[] = [];
        let match;
        while ((match = citationRegex.exec(fullContent)) !== null) {
          citations.push({ doc: match[1].trim(), page: match[2] ? `p.${match[2]}` : '' });
        }

        // Simple sentiment heuristic
        const negWords = ['error', 'fault', 'fail', 'problem', 'danger', 'critical', 'alarm', 'trip', 'emergency'];
        const posWords = ['optimal', 'normal', 'good', 'recommend', 'efficient', 'improve', 'success'];
        const lower = message.toLowerCase();
        const sentiment = negWords.some(w => lower.includes(w)) ? 'neg'
          : posWords.some(w => lower.includes(w)) ? 'pos' : 'neu';

        // Save AI message
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

          // Update conversation timestamp
          await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', newConvId);
        }

        // Increment query counter
        await supabase.rpc('increment_user_queries', { uid: user.id });

        // Audit log
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_name: user.email,
          action: 'Query submitted',
          resource: 'Chat session',
          metadata: { dept, response_ms: responseMs },
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', citations, sentiment, responseMs })}\n\n`));
        controller.close();
      } catch (err) {
        console.error('Chat stream error:', err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'AI response failed' })}\n\n`));
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
