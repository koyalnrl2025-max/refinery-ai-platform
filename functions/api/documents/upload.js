/**
 * Cloudflare Pages Function — POST /api/documents/upload
 *
 * Full document processing pipeline on the edge:
 *   receive file → extract text → chunk → embed (OpenAI) → store in Supabase
 *
 * Handles: DOCX, PDF (text-based), TXT
 * Embeddings: OpenAI text-embedding-3-small with dimensions=768
 *   (matches the vector(768) column used by the local Ollama nomic-embed-text)
 */

import { unzipSync, strFromU8 } from 'fflate';

// ── Text chunking (same logic as src/lib/chunker.ts) ─────────────────────────
const CHUNK_SIZE = 1400;
const OVERLAP    = 200;

function chunkText(text) {
  const normalised = text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

  if (!normalised) return [];
  if (normalised.length <= CHUNK_SIZE) return [normalised];

  const chunks = [];
  let start = 0;
  while (start < normalised.length) {
    const end = Math.min(start + CHUNK_SIZE, normalised.length);
    let splitAt = end;
    if (end < normalised.length) {
      const parBreak = normalised.lastIndexOf('\n\n', end);
      if (parBreak > start + CHUNK_SIZE / 2) {
        splitAt = parBreak + 2;
      } else {
        const sentBreak = normalised.lastIndexOf('. ', end);
        if (sentBreak > start + CHUNK_SIZE / 2) splitAt = sentBreak + 2;
      }
    }
    const chunk = normalised.slice(start, splitAt).trim();
    if (chunk.length > 60) chunks.push(chunk);
    start = splitAt - OVERLAP;
    if (start <= 0 || splitAt >= normalised.length) break;
  }
  return chunks;
}

// ── Text extraction ────────────────────────────────────────────────────────────
function extractTxt(buffer) {
  return new TextDecoder('utf-8').decode(buffer);
}

function extractDocx(buffer) {
  try {
    const files = unzipSync(new Uint8Array(buffer));
    const xmlFile = files['word/document.xml'];
    if (!xmlFile) return '';
    const xml = strFromU8(xmlFile);
    // Strip XML tags, decode common entities, collapse whitespace
    return xml
      .replace(/<w:p[ >][^>]*>/gi, '\n')   // paragraph → newline
      .replace(/<[^>]+>/g, ' ')             // strip all tags
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&quot;/g, '"')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    return '';
  }
}

function extractPdf(buffer) {
  // Lightweight text extraction from PDF binary streams.
  // Works for machine-generated PDFs (most common case).
  // Image-only PDFs (scanned) will return empty.
  try {
    const raw = new TextDecoder('latin1').decode(buffer);
    const text = [];
    const btEt = /BT([\s\S]*?)ET/g;
    let match;
    while ((match = btEt.exec(raw)) !== null) {
      const block = match[1];
      // (text) Tj  and  [(t)(e)(x)(t)] TJ
      const tjSingle = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
      const tjArray  = /\[([\s\S]*?)\]\s*TJ/g;
      let m;
      while ((m = tjSingle.exec(block)) !== null) {
        text.push(m[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\'));
      }
      while ((m = tjArray.exec(block)) !== null) {
        const parts = [...m[1].matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g)].map(p => p[1]);
        if (parts.length) text.push(parts.join(''));
      }
    }
    return text.join(' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  } catch {
    return '';
  }
}

async function extractText(arrayBuffer, filename) {
  const ext  = filename.split('.').pop()?.toLowerCase();
  const buf  = arrayBuffer;
  if (ext === 'txt')               return extractTxt(buf);
  if (ext === 'docx' || ext === 'doc') return extractDocx(buf);
  if (ext === 'pdf')               return extractPdf(buf);
  return '';
}

// ── OpenAI embeddings (dimensions=768 matches our vector column) ──────────────
async function embedBatch(texts, apiKey) {
  const results = [];
  // Embed one at a time — keeps memory low in the Worker
  for (const text of texts) {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 768 }),
    });
    if (!res.ok) throw new Error(`OpenAI embedding error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    results.push(data.data[0].embedding);
  }
  return results;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  const SUPABASE_URL  = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const OPENAI_KEY    = env.OPENAI_API_KEY;

  if (!OPENAI_KEY)
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), { status: 500 });

  // Auth
  const authHeader = request.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer '))
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const token = authHeader.slice(7);

  // Verify user
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON },
  });
  if (!userRes.ok)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  const user = await userRes.json();

  // Check admin/mgr role via profiles table
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` } }
  );
  const profiles = await profileRes.json();
  const role = profiles[0]?.role;
  if (!['admin', 'mgr'].includes(role))
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

  // Parse multipart form
  const formData = await request.formData();
  const file = formData.get('file');
  const dept = formData.get('dept');
  if (!file || !dept)
    return new Response(JSON.stringify({ error: 'file and dept required' }), { status: 400 });

  const fileBuffer  = await file.arrayBuffer();
  const fileSizeBytes = fileBuffer.byteLength;
  const fileSizeStr   = fileSizeBytes > 1_048_576
    ? `${(fileSizeBytes / 1_048_576).toFixed(1)} MB`
    : `${Math.round(fileSizeBytes / 1024)} KB`;

  const sbHeaders = {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // 1. Upload to Supabase Storage
  const storagePath = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/documents/${storagePath}`,
    {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}`, 'Content-Type': file.type || 'application/octet-stream' },
      body: fileBuffer,
    }
  );
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return new Response(JSON.stringify({ error: `Storage upload failed: ${err}` }), { status: 500 });
  }

  // 2. Create document record
  const docInsertRes = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify({
      name: file.name, dept, file_size: fileSizeStr, file_size_bytes: fileSizeBytes,
      storage_path: storagePath, uploaded_by: user.id, status: 'processing', chunks: 0,
    }),
  });
  if (!docInsertRes.ok) {
    const err = await docInsertRes.text();
    return new Response(JSON.stringify({ error: `DB insert failed: ${err}` }), { status: 500 });
  }
  const docData = await docInsertRes.json();
  const docId = Array.isArray(docData) ? docData[0]?.id : docData?.id;

  // 3. Extract text
  const rawText = await extractText(fileBuffer, file.name);
  if (!rawText.trim()) {
    await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${docId}`, {
      method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'error' }),
    });
    return new Response(JSON.stringify({ error: 'No extractable text. File may be image-based or unsupported.' }), { status: 422 });
  }

  // 4. Chunk
  const chunks = chunkText(rawText);
  if (!chunks.length) {
    await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${docId}`, {
      method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'error' }),
    });
    return new Response(JSON.stringify({ error: 'Text produced no chunks.' }), { status: 422 });
  }

  // 5. Embed
  let embeddings;
  try {
    embeddings = await embedBatch(chunks, OPENAI_KEY);
  } catch (err) {
    await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${docId}`, {
      method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ status: 'error' }),
    });
    return new Response(JSON.stringify({ error: `Embedding failed: ${err.message}` }), { status: 500 });
  }

  // 6. Store chunks in batches of 20
  const rows = chunks.map((content, i) => ({
    document_id: docId, dept, chunk_index: i, content,
    embedding: JSON.stringify(embeddings[i]),
  }));
  for (let i = 0; i < rows.length; i += 20) {
    const batchRes = await fetch(`${SUPABASE_URL}/rest/v1/document_chunks`, {
      method: 'POST',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify(rows.slice(i, i + 20)),
    });
    if (!batchRes.ok) {
      const err = await batchRes.text();
      return new Response(JSON.stringify({ error: `Chunk insert failed: ${err}` }), { status: 500 });
    }
  }

  // 7. Mark as indexed
  await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${docId}`, {
    method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'indexed', chunks: chunks.length }),
  });

  // Audit log
  await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: user.id, user_name: user.email,
      action: 'Document upload', resource: file.name,
      metadata: { dept, size: fileSizeStr, chunks: chunks.length, via: 'cloudflare-function' },
    }),
  });

  return new Response(JSON.stringify({ id: docId, name: file.name, status: 'indexed', chunks: chunks.length }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
