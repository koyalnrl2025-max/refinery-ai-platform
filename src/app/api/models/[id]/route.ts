import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export function generateStaticParams() { return []; }

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { active } = await request.json();
  const { data, error } = await supabase
    .from('model_configs')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    user_id: user.id, user_name: user.email,
    action: `Model ${active ? 'enabled' : 'disabled'}`, resource: data.name,
  });

  return NextResponse.json(data);
}
