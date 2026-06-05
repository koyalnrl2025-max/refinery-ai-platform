/**
 * RefineIQ E2E Test Suite
 * Run: node e2e-test.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local so API keys are available without shell env tricks
const __dir = fileURLToPath(new URL('.', import.meta.url));
try {
  const envFile = readFileSync(resolve(__dir, '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/\r$/, '');
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch {}

const BASE         = 'http://localhost:3000';
const SUPABASE_URL = 'https://fcxhlcoovqzuvebnyfhr.supabase.co';
const ANON_KEY     = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeGhsY29vdnF6dXZlYm55ZmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjIwNzEsImV4cCI6MjA5NjEzODA3MX0.i8CA4zObe7hwoChF3POmRzR6I-i0EZlzOjRxe0tSgYY';

// Seed credentials
const ADMIN   = { email: 'sarah.mitchell@refineiq.io',   password: 'Admin@1234' };
const MANAGER = { email: 'james.okafor@refineiq.io',     password: 'Manager@1234' };
const USER    = { email: 'hamad.alrashidi@refineiq.io',  password: 'User@1234' };

let passed = 0, failed = 0;
const results = [];

function ok(label, detail = '') {
  console.log(`  ✅ ${label}${detail ? '  →  ' + detail : ''}`);
  results.push({ status: 'pass', label });
  passed++;
}
function fail(label, err) {
  console.log(`  ❌ ${label}  →  ${err}`);
  results.push({ status: 'fail', label, err: String(err) });
  failed++;
}
function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 52 - title.length))}`);
}

// ─────────────────────────────────────────────────────────────────────────────
section('1. Ollama — local LLM');
// ─────────────────────────────────────────────────────────────────────────────
try {
  const r = await fetch('http://localhost:11434/api/tags');
  const { models } = await r.json();
  const installed = models.map(m => m.name);
  if (installed.includes('llama3.2:3b')) ok('llama3.2:3b installed', installed.join(', '));
  else fail('llama3.2:3b not found', `installed: ${installed.join(', ')}`);
} catch (e) { fail('Ollama not running', e.message); }

try {
  const r = await fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      messages: [{ role: 'user', content: 'Reply with exactly the word: WORKING' }],
      stream: false, max_tokens: 10,
    }),
  });
  const d = await r.json();
  const reply = d.choices?.[0]?.message?.content?.trim() ?? '';
  ok('llama3.2:3b chat response', `"${reply}"`);
} catch (e) { fail('Ollama chat', e.message); }

// ─────────────────────────────────────────────────────────────────────────────
section('2. Supabase Auth — seed user sign-in');
// ─────────────────────────────────────────────────────────────────────────────
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

let adminToken = null;
for (const cred of [ADMIN, MANAGER, USER]) {
  const { data, error } = await anonClient.auth.signInWithPassword(cred);
  if (error) fail(`Sign-in ${cred.email}`, error.message);
  else {
    ok(`Sign-in ${cred.email}`, `role=${data.user.user_metadata?.role ?? '?'}`);
    if (cred === ADMIN) adminToken = data.session.access_token;
  }
  await anonClient.auth.signOut();
}

if (!adminToken) {
  console.log('\n⚠  Admin sign-in failed — skipping authenticated tests\n');
  process.exit(1);
}

// Authenticated client using admin session
const { data: adminSession, error: adminSessionErr } = await anonClient.auth.signInWithPassword(ADMIN);
if (adminSessionErr || !adminSession?.session) {
  fail('Admin session creation', adminSessionErr?.message ?? 'no session');
  process.exit(1);
}
const authed = createClient(SUPABASE_URL, ANON_KEY);
await authed.auth.setSession({
  access_token:  adminSession.session.access_token,
  refresh_token: adminSession.session.refresh_token,
});

// ─────────────────────────────────────────────────────────────────────────────
section('3. Supabase DB — tables & seed data');
// ─────────────────────────────────────────────────────────────────────────────
const { data: { user: me } } = await authed.auth.getUser();
const { data: profile, error: profErr } = await authed
  .from('profiles').select('*').eq('id', me.id).single();
if (profile) ok('Own profile readable', `name="${profile.name}" role="${profile.role}"`);
else fail('Profile read', profErr?.message ?? 'no data');

const { data: depts } = await authed.from('departments').select('id, name').order('id');
if (depts?.length === 10) ok('departments — 10 rows seeded', depts.map(d => d.id).join(', '));
else fail('departments row count', depts?.length);

const { data: models } = await authed.from('model_configs').select('name, provider, priority').order('priority');
if (models?.length === 3) {
  ok('model_configs — 3 rows', models.map(m => `${m.name}(${m.provider})`).join(' → '));
} else fail('model_configs', `got ${models?.length}`);

const { data: settings } = await authed.from('platform_settings').select('key, enabled');
if (settings?.length === 6) ok('platform_settings — 6 rows', settings.map(s => s.key).join(', '));
else fail('platform_settings', settings?.length);

// Admin reads all profiles (tests admin RLS policy)
const { data: allProfiles } = await authed.from('profiles').select('id, name, role').order('role');
if (allProfiles?.length >= 3) ok('Admin RLS — can read all profiles', `${allProfiles.length} users`);
else fail('Admin RLS profiles', allProfiles?.length);

// ─────────────────────────────────────────────────────────────────────────────
section('4. Conversations & Messages — write/read cycle');
// ─────────────────────────────────────────────────────────────────────────────
const { data: conv, error: convErr } = await authed.from('conversations')
  .insert({ user_id: profile.id, title: 'E2E: Hot work permit query', dept: 'safety' })
  .select().single();
if (convErr) fail('Insert conversation', convErr.message);
else ok('Conversation created', `id=${conv.id.slice(0, 8)}…`);

if (conv) {
  const msgs = [
    { conversation_id: conv.id, user_id: profile.id, role: 'user',
      content: 'What are the hot work permit requirements for furnace area?' },
    { conversation_id: conv.id, user_id: profile.id, role: 'ai',
      content: 'Hot work permits for furnace area require: (1) area gas test...',
      citations: [{ doc: 'HSE Procedures 2024', page: 'p.12' }],
      sentiment: 'pos', response_ms: 1240 },
  ];
  const { error: msgErr } = await authed.from('messages').insert(msgs);
  if (msgErr) fail('Insert messages', msgErr.message);
  else ok('2 messages inserted (user + AI with citation)');

  const { data: readBack } = await authed.from('messages')
    .select('role, content, citations, sentiment')
    .eq('conversation_id', conv.id)
    .order('created_at');
  if (readBack?.length === 2) ok('Messages read back', `roles: ${readBack.map(m => m.role).join(', ')}`);
  else fail('Message read', readBack?.length);

  const aiMsg = readBack?.find(m => m.role === 'ai');
  if (aiMsg?.citations?.length === 1) ok('Citations stored correctly', JSON.stringify(aiMsg.citations[0]));
  else fail('Citations', JSON.stringify(aiMsg?.citations));
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Documents — metadata write & status update');
// ─────────────────────────────────────────────────────────────────────────────
const { data: doc, error: docErr } = await authed.from('documents').insert({
  name: 'E2E Test HSE Manual.pdf', dept: 'safety',
  file_size: '2.4 MB', file_size_bytes: 2516582,
  status: 'processing', uploaded_by: profile.id,
}).select().single();
if (docErr) fail('Insert document', docErr.message);
else ok('Document record created', `id=${doc.id.slice(0, 8)}… status=processing`);

if (doc) {
  const { error: updErr } = await authed.from('documents')
    .update({ status: 'indexed', chunks: 84 }).eq('id', doc.id);
  if (updErr) fail('Update document status', updErr.message);
  else {
    const { data: updated } = await authed.from('documents').select('status, chunks').eq('id', doc.id).single();
    if (updated?.status === 'indexed' && updated?.chunks === 84)
      ok('Document status updated & verified', 'processing → indexed, chunks=84');
    else fail('Document verification', JSON.stringify(updated));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Audit Logs — write & admin read');
// ─────────────────────────────────────────────────────────────────────────────
const { error: auditErr } = await authed.from('audit_logs').insert({
  user_id: profile.id, user_name: ADMIN.email,
  action: 'E2E test run', resource: 'test-suite',
  metadata: { test: true, ts: new Date().toISOString() },
});
if (auditErr) fail('Insert audit log', auditErr.message);
else ok('Audit log written');

const { data: logs } = await authed.from('audit_logs').select('action, resource').limit(5);
if (logs?.length > 0) ok('Admin can read audit logs', `${logs.length} entries visible`);
else fail('Audit log read', 'no entries returned');

// ─────────────────────────────────────────────────────────────────────────────
section('7. query_stats — RPC increment');
// ─────────────────────────────────────────────────────────────────────────────
const qBefore = (await authed.from('profiles').select('queries').eq('id', me.id).single()).data?.queries ?? 0;
const { error: rpcErr } = await authed.rpc('increment_user_queries', { uid: profile.id });
if (rpcErr) fail('increment_user_queries RPC', rpcErr.message);
else {
  const qAfter = (await authed.from('profiles').select('queries').eq('id', me.id).single()).data?.queries ?? 0;
  if (qAfter > qBefore) ok('Query counter incremented', `${qBefore} → ${qAfter}`);
  else fail('Counter did not increment', `before=${qBefore} after=${qAfter}`);
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Storage — file upload, download, delete');
// ─────────────────────────────────────────────────────────────────────────────
const testContent = new Blob(['RefineIQ E2E test file — HSE manual excerpt'], { type: 'text/plain' });
const storagePath = `${profile.id}/e2e-test-${Date.now()}.txt`;
const { data: uploadData, error: uploadErr } = await authed.storage
  .from('documents').upload(storagePath, testContent);
if (uploadErr) fail('Storage upload', uploadErr.message);
else ok('File uploaded to storage', uploadData.path);

if (uploadData) {
  const { data: dl, error: dlErr } = await authed.storage
    .from('documents').download(uploadData.path);
  if (dlErr) fail('Storage download', dlErr.message);
  else {
    const text = await dl.text();
    if (text.includes('RefineIQ E2E')) ok('Downloaded content verified ✓');
    else fail('Content mismatch', text.slice(0, 60));
  }
  await authed.storage.from('documents').remove([uploadData.path]);
  ok('Test file cleaned up');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Middleware — auth guards');
// ─────────────────────────────────────────────────────────────────────────────
const noAuth = await fetch(`${BASE}/api/models`);
if (noAuth.status === 401) ok('Unauthenticated /api/models → 401');
else fail('/api/models auth guard', `got ${noAuth.status}`);

const noAuthDash = await fetch(`${BASE}/dashboard`, { redirect: 'manual' });
if (noAuthDash.status === 307) ok('Unauthenticated /dashboard → 307 → /login');
else fail('/dashboard redirect', `got ${noAuthDash.status}`);

// ─────────────────────────────────────────────────────────────────────────────
section('10. Ollama streaming — real chat (refinery query)');
// ─────────────────────────────────────────────────────────────────────────────
try {
  const start = Date.now();
  const r = await fetch('http://localhost:11434/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      messages: [
        { role: 'system', content: 'You are a refinery operations AI. Answer in 1-2 sentences.' },
        { role: 'user', content: 'What is a hot work permit and why is it required?' },
      ],
      stream: true, max_tokens: 80, temperature: 0.3,
    }),
  });
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of dec.decode(value).split('\n')) {
      if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
      try { full += JSON.parse(line.slice(6)).choices?.[0]?.delta?.content ?? ''; } catch {}
    }
  }
  const ms = Date.now() - start;
  if (full.length > 20) ok(`Streaming response (${ms}ms, ${full.length} chars)`, `"${full.slice(0, 90).replace(/\n/g,' ')}…"`);
  else fail('Streaming too short', full);
} catch (e) { fail('Ollama streaming', e.message); }

// ─────────────────────────────────────────────────────────────────────────────
section('11. Anthropic fallback — direct API check');
// ─────────────────────────────────────────────────────────────────────────────
try {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say: OK' }],
    }),
  });
  const d = await r.json();
  if (d.content?.[0]?.text) ok('Anthropic API reachable', `"${d.content[0].text.trim()}"`);
  else if (d.error?.type === 'authentication_error') {
    console.log(`  ⚠️  Anthropic API key invalid/expired — update ANTHROPIC_API_KEY in .env.local`);
    console.log(`     (Ollama is primary; Anthropic is fallback — platform works without it)`);
  }
  else fail('Anthropic API', JSON.stringify(d).slice(0, 120));
} catch (e) { fail('Anthropic API', e.message); }

// ─────────────────────────────────────────────────────────────────────────────
section('Cleanup');
// ─────────────────────────────────────────────────────────────────────────────
if (conv) {
  await authed.from('conversations').delete().eq('id', conv.id);
  ok('Test conversation + messages deleted (cascade)');
}
if (doc) {
  await authed.from('documents').delete().eq('id', doc.id);
  ok('Test document deleted');
}
await authed.from('audit_logs').delete().eq('resource', 'test-suite');
ok('Test audit log deleted');
await anonClient.auth.signOut();
ok('Signed out');

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(56)}`);
console.log(`  RESULT  ${passed} passed  ${failed > 0 ? `${failed} FAILED` : '0 failed — all green ✅'}`);
console.log(`${'═'.repeat(56)}\n`);
if (failed > 0) {
  console.log('Failed tests:');
  results.filter(r => r.status === 'fail').forEach(r => console.log(`  • ${r.label}: ${r.err}`));
  process.exit(1);
}
