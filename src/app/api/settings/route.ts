import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('platform_settings')
    .select('key, label, description, enabled')
    .order('key');

  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { key, enabled } = await request.json();
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const { data, error } = await supabase
    .from('platform_settings')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('key', key)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    user_id: user.id, user_name: user.email,
    action: `Setting ${enabled ? 'enabled' : 'disabled'}`, resource: key,
  });

  return NextResponse.json(data);
}
