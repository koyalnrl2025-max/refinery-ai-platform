import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const dept = searchParams.get('dept');
  const search = searchParams.get('search');

  let query = supabase
    .from('documents')
    .select('id, name, dept, file_size, chunks, status, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);
  if (dept && dept !== 'all') query = query.eq('dept', dept);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check admin/mgr role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin','mgr'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, dept, file_size, file_size_bytes, storage_path } = body;

  const { data, error } = await supabase.from('documents').insert({
    name, dept, file_size, file_size_bytes, storage_path,
    uploaded_by: user.id,
    status: 'processing',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id, user_name: user.email,
    action: 'Document upload', resource: name,
    metadata: { dept, size: file_size },
  });

  // Simulate processing → indexed after 3s (real RAG pipeline would hook here)
  setTimeout(async () => {
    const chunks = Math.floor(Math.random() * 100) + 20;
    await supabase.from('documents').update({ status: 'indexed', chunks }).eq('id', data.id);
    await supabase.from('departments').update({ docs_count: supabase.rpc('increment', { x: 1 }) as any }).eq('id', dept);
  }, 3000);

  return NextResponse.json(data, { status: 201 });
}
