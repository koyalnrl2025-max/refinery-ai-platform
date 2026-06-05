/**
 * Cloudflare Pages Function — /api/chat
 * Runs on Cloudflare's edge alongside the static Next.js export.
 * No Node.js — uses fetch() directly against Anthropic / OpenAI APIs.
 * Secrets set via: wrangler pages secret put <KEY> --project-name refineiq-demo
 */

const SYSTEM_PROMPT = `You are RefineIQ, an AI assistant for a refinery organisation's Operations and HR departments.
Your primary knowledge base is the documents uploaded by your organisation.

Rules:
1. Answer from your training knowledge about refinery operations and HR best practices.
2. If the question is about specific internal policy, clearly state: "For precise internal policy details, please check the uploaded documents on the local platform."
3. Be concise, professional, and structured. Use bullet points for lists.
4. Flag safety-critical information prominently.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  // ── CORS preflight ────────────────────────────────────────────────────────
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const token = authHeader.slice(7);

  // ── Parse body ────────────────────────────────────────────────────────────
  let message, conversationId, dept;
  try {
    ({ message, conversationId, dept } = await request.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }
  if (!message) return new Response(JSON.stringify({ error: 'message required' }), { status: 400 });

  const SUPABASE_URL  = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const startMs       = Date.now();

  // ── Verify Supabase JWT ───────────────────────────────────────────────────
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON },
  });
  if (!userRes.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const user = await userRes.json();

  const sbHeaders = {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // ── Stream SSE back to browser ─────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // 1. Create conversation if new
        let convId = conversationId;
        if (!convId) {
          const title = message.length > 50 ? message.slice(0, 50) + '…' : message;
          const convRes = await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
            method: 'POST',
            headers: sbHeaders,
            body: JSON.stringify({ user_id: user.id, title, dept: dept ?? 'all' }),
          });
          const convData = await convRes.json();
          convId = Array.isArray(convData) ? convData[0]?.id : convData?.id;
        }
        send({ type: 'conv_id', id: convId });
        send({ type: 'context', chunks: 0, hasDocs: false }); // RAG needs local Ollama

        // 2. Save user message
        if (convId) {
          await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
            method: 'POST',
            headers: { ...sbHeaders, Prefer: 'return=minimal' },
            body: JSON.stringify({ conversation_id: convId, user_id: user.id, role: 'user', content: message }),
          });
        }

        // 3. Try Anthropic first, then OpenAI
        let fullContent = '';
        let provider = 'anthropic';
        let modelId  = 'claude-haiku-4-5-20251001';
        let llmOk    = false;

        // ── Anthropic ────────────────────────────────────────────────────────
        if (env.ANTHROPIC_API_KEY) {
          try {
            const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: modelId,
                max_tokens: 1024,
                stream: true,
                system: SYSTEM_PROMPT,
                messages: [{ role: 'user', content: message }],
              }),
            });

            if (anthropicRes.ok) {
              send({ type: 'model', provider: 'anthropic', modelId });
              const reader  = anthropicRes.body.getReader();
              const decoder = new TextDecoder();
              let buf = '';
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  const raw = line.slice(6);
                  if (raw === '[DONE]') continue;
                  try {
                    const ev = JSON.parse(raw);
                    if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
                      const text = ev.delta.text;
                      fullContent += text;
                      send({ type: 'delta', text });
                    }
                  } catch {}
                }
              }
              llmOk = true;
            }
          } catch {}
        }

        // ── OpenAI fallback ──────────────────────────────────────────────────
        if (!llmOk && env.OPENAI_API_KEY) {
          provider = 'openai';
          modelId  = 'gpt-4o-mini';
          try {
            const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: modelId,
                stream: true,
                messages: [
                  { role: 'system', content: SYSTEM_PROMPT },
                  { role: 'user', content: message },
                ],
              }),
            });

            if (openaiRes.ok) {
              send({ type: 'model', provider: 'openai', modelId });
              const reader  = openaiRes.body.getReader();
              const decoder = new TextDecoder();
              let buf = '';
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop() ?? '';
                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  const raw = line.slice(6);
                  if (raw === '[DONE]') continue;
                  try {
                    const text = JSON.parse(raw).choices?.[0]?.delta?.content ?? '';
                    if (text) { fullContent += text; send({ type: 'delta', text }); }
                  } catch {}
                }
              }
              llmOk = true;
            }
          } catch {}
        }

        if (!llmOk) {
          send({ type: 'error', message: 'No AI provider available. Check API keys in Cloudflare.' });
          controller.close();
          return;
        }

        const responseMs = Date.now() - startMs;

        // 4. Save AI message
        if (convId) {
          await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
            method: 'POST',
            headers: { ...sbHeaders, Prefer: 'return=minimal' },
            body: JSON.stringify({ conversation_id: convId, user_id: user.id, role: 'ai', content: fullContent, citations: [], sentiment: 'neu', response_ms: responseMs }),
          });
          // Update conversation timestamp
          await fetch(`${SUPABASE_URL}/rest/v1/conversations?id=eq.${convId}`, {
            method: 'PATCH',
            headers: { ...sbHeaders, Prefer: 'return=minimal' },
            body: JSON.stringify({ updated_at: new Date().toISOString() }),
          });
        }

        // 5. Increment query counter
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_user_queries`, {
          method: 'POST',
          headers: { ...sbHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({ uid: user.id }),
        });

        send({ type: 'done', citations: [], sentiment: 'neu', responseMs, provider, modelId });
        controller.close();

      } catch (err) {
        send({ type: 'error', message: 'Unexpected error. Please try again.' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
