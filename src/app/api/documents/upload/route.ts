import { createClient }  from '@/lib/supabase/server';
import { indexDocument }  from '@/lib/indexDocument';
import { NextResponse }   from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'mgr'].includes(profile.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const dept = formData.get('dept') as string;

  if (!file || !dept) return NextResponse.json({ error: 'file and dept required' }, { status: 400 });

  // ── 1. Upload raw file to Supabase Storage ──────────────────────────────
  const storagePath = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const fileBuffer  = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, { contentType: file.type });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  // ── 2. Create document record (status: processing) ──────────────────────
  const fileSizeBytes = file.size;
  const fileSizeStr   = fileSizeBytes > 1_048_576
    ? `${(fileSizeBytes / 1_048_576).toFixed(1)} MB`
    : `${Math.round(fileSizeBytes / 1024)} KB`;

  const { data: doc, error: dbError } = await supabase.from('documents').insert({
    name: file.name, dept, file_size: fileSizeStr, file_size_bytes: fileSizeBytes,
    storage_path: storagePath, uploaded_by: user.id, status: 'processing', chunks: 0,
  }).select().single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    user_id: user.id, user_name: user.email,
    action: 'Document upload', resource: file.name,
    metadata: { dept, size: fileSizeStr },
  });

  // ── 3. Extract → chunk → embed → store (background, non-blocking) ───────
  indexDocument(doc.id, dept, fileBuffer, file.name, supabase)
    .then(({ chunks }) => console.log(`[upload] indexed "${file.name}": ${chunks} chunks`))
    .catch(err => {
      console.error(`[upload] indexing failed for "${file.name}":`, err.message);
      supabase.from('audit_logs').insert({
        user_id: user.id, user_name: user.email,
        action: 'Document indexing failed', resource: file.name,
        metadata: { error: err.message },
      });
    });

  return NextResponse.json(doc, { status: 201 });
}
