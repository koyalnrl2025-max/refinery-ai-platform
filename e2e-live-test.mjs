/**
 * Live E2E test — refineiq-demo.pages.dev
 * Tests: login, static pages, CORS, document upload+indexing, chat+RAG, DB state
 */
const BASE         = 'https://refineiq-demo.pages.dev';
const SUPABASE_URL = 'https://fcxhlcoovqzuvebnyfhr.supabase.co';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeGhsY29vdnF6dXZlYm55ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjIwNzEsImV4cCI6MjA5NjEzODA3MX0.i8CA4zObe7hwoChF3POmRzR6I-i0EZlzOjRxe0tSgYY';

let passed = 0, failed = 0;
const ok   = (msg, detail = '') => { console.log('  ✅', msg, detail ? `→ ${detail}` : ''); passed++; };
const fail = (msg, err)         => { console.log('  ❌', msg, `→ ${err}`); failed++; };
const sep  = (t) => console.log(`\n── ${t}`);

// ── 1. Login ──────────────────────────────────────────────────────────────────
sep('1. Login');
const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'sarah.mitchell@refineiq.io', password: 'Admin@1234' }),
});
const { access_token, user } = await loginRes.json();
if (!access_token) { fail('Login', 'no token'); process.exit(1); }
ok('Login as sarah.mitchell@refineiq.io (admin)');

const auth = { Authorization: `Bearer ${access_token}`, apikey: ANON_KEY };

// ── 2. Static pages reachable ─────────────────────────────────────────────────
sep('2. Static pages on Cloudflare Pages');
for (const path of ['/login/', '/dashboard/', '/chat/', '/admin/']) {
  const r = await fetch(`${BASE}${path}`);
  r.status === 200 ? ok(path) : fail(path, `status ${r.status}`);
}

// ── 3. Upload endpoint CORS preflight ─────────────────────────────────────────
sep('3. Upload endpoint CORS');
const optRes = await fetch(`${BASE}/api/documents/upload`, { method: 'OPTIONS' });
optRes.status === 204
  ? ok('OPTIONS /api/documents/upload → 204')
  : fail('CORS preflight', `status ${optRes.status}`);

// ── 4. Document upload via Cloudflare Function ────────────────────────────────
sep('4. Document upload (Cloudflare Function → extract → embed → index)');
let testDocId = null;

const storageRes = await fetch(
  `${SUPABASE_URL}/rest/v1/documents?status=eq.indexed&select=storage_path,name&limit=1`,
  { headers: auth }
);
const existingDocs = await storageRes.json();

if (existingDocs[0]?.storage_path) {
  const fileRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/documents/${existingDocs[0].storage_path}`,
    { headers: auth }
  );
  if (fileRes.ok) {
    const blob = await fileRes.blob();
    const fd = new FormData();
    fd.append('file', blob, 'E2E_Test_Upload.docx');
    fd.append('dept', 'hr');

    const uploadRes = await fetch(`${BASE}/api/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}` },
      body: fd,
    });
    const uploadData = await uploadRes.json();

    if (uploadRes.status === 201 && uploadData.chunks > 0) {
      testDocId = uploadData.id;
      ok('Upload + full indexing via Cloudflare Function', `${uploadData.chunks} chunks, status=${uploadData.status}`);
    } else {
      fail('Upload failed', JSON.stringify(uploadData).slice(0, 200));
    }
  } else {
    fail('Could not download test fixture from storage', `${fileRes.status}`);
  }
} else {
  fail('No indexed document to use as upload test fixture', 'upload manually first');
}

// ── 5. Chat API with RAG ──────────────────────────────────────────────────────
sep('5. Chat API with RAG (Cloudflare Function)');
const chatRes = await fetch(`${BASE}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
  body: JSON.stringify({ message: 'What is the leave policy?', dept: 'hr' }),
});

if (!chatRes.ok || !chatRes.body) {
  fail('Chat API', `status ${chatRes.status}`);
} else {
  const reader = chatRes.body.getReader();
  const dec = new TextDecoder();
  let buf = '', fullText = '', provider = '', ragChunks = -1, done = false;

  while (!done) {
    const { value, done: d } = await reader.read();
    if (d) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const ev = JSON.parse(line.slice(6));
        if (ev.type === 'model')   provider = `${ev.provider}/${ev.modelId}`;
        if (ev.type === 'context') ragChunks = ev.chunks;
        if (ev.type === 'delta')   fullText += ev.text;
        if (ev.type === 'done')    done = true;
        if (ev.type === 'error')  { fail('Chat error event', ev.message); done = true; }
      } catch {}
    }
  }

  if (fullText.length > 20) {
    ok(`Chat response (${fullText.length} chars)`, `provider=${provider}`);
    ok(`RAG context`, `${ragChunks} chunks retrieved from documents`);
    ok('Response preview', `"${fullText.slice(0, 120).replace(/\n/g, ' ')}…"`);
  } else {
    fail('Chat returned no content', fullText || 'empty');
  }
}

// ── 6. DB state verification ──────────────────────────────────────────────────
sep('6. DB state');
const docsRes = await fetch(
  `${SUPABASE_URL}/rest/v1/documents?select=name,dept,status,chunks&order=created_at.asc`,
  { headers: auth }
);
const docs = await docsRes.json();
ok('Documents', docs.map(d => `${d.name}[${d.status},${d.chunks}ch]`).join(', ') || 'none');

const convsRes = await fetch(
  `${SUPABASE_URL}/rest/v1/conversations?user_id=eq.${user.id}&select=title&order=created_at.desc&limit=1`,
  { headers: auth }
);
const convs = await convsRes.json();
convs[0] ? ok('Conversation saved', convs[0].title) : fail('No conversation saved', '');

const msgsRes = await fetch(
  `${SUPABASE_URL}/rest/v1/messages?user_id=eq.${user.id}&select=role&order=created_at.desc&limit=4`,
  { headers: auth }
);
const msgs = await msgsRes.json();
ok('Messages saved', `${msgs.length} messages, roles: ${msgs.map(m => m.role).join(', ')}`);

// ── Cleanup ───────────────────────────────────────────────────────────────────
sep('Cleanup');
if (testDocId) {
  await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${testDocId}`, {
    method: 'DELETE', headers: { ...auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  });
  ok('Test document deleted');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(52)}`);
console.log(`  RESULT  ${passed} passed  ${failed > 0 ? `${failed} FAILED ❌` : '0 failed — all green ✅'}`);
console.log(`${'═'.repeat(52)}\n`);
if (failed > 0) process.exit(1);
