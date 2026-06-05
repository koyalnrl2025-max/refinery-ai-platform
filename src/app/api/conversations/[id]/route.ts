import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('messages')
    .select('id, role, content, citations, sentiment, response_ms, created_at')
    .eq('conversation_id', params.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await supabase.from('conversations').delete().eq('id', params.id).eq('user_id', user.id);
  return NextResponse.json({ success: true });
}
