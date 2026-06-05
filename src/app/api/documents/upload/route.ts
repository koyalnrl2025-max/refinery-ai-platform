import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'mgr'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const dept = formData.get('dept') as string;

  if (!file || !dept) return NextResponse.json({ error: 'file and dept required' }, { status: 400 });

  const ext = file.name.split('.').pop();
  const path = `${user.id}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, file, { contentType: file.type });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const fileSizeBytes = file.size;
  const fileSizeStr = fileSizeBytes > 1024 * 1024
    ? `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(fileSizeBytes / 1024)} KB`;

  const { data: doc, error: dbError } = await supabase.from('documents').insert({
    name: file.name,
    dept,
    file_size: fileSizeStr,
    file_size_bytes: fileSizeBytes,
    storage_path: path,
    uploaded_by: user.id,
    status: 'processing',
    chunks: 0,
  }).select().single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    user_id: user.id, user_name: user.email,
    action: 'Document upload', resource: file.name,
    metadata: { dept, size: fileSizeStr, path },
  });

  // Simulate indexing completion (real pipeline: trigger chunking + embedding here)
  setTimeout(async () => {
    const chunks = Math.floor(fileSizeBytes / 3000) + 10;
    await supabase.from('documents').update({ status: 'indexed', chunks }).eq('id', doc.id);
  }, 4000);

  return NextResponse.json(doc, { status: 201 });
}
