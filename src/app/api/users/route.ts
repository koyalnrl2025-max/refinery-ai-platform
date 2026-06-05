import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'mgr'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  let query = supabase
    .from('profiles')
    .select('id, name, email, role, dept, status, last_seen, queries, enabled, created_at')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { email, name, role, dept } = await request.json();
  if (!email || !name) return NextResponse.json({ error: 'email and name required' }, { status: 400 });

  // Invite user via Supabase Auth (they'll receive a magic link)
  const { createServiceClient } = await import('@/lib/supabase/server');
  const adminClient = createServiceClient();
  const { data: invited, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: name, role: role ?? 'user', dept: dept ?? 'all' },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    user_id: user.id, user_name: user.email,
    action: 'User invited', resource: email,
    metadata: { name, role, dept },
  });

  return NextResponse.json({ success: true, userId: invited.user.id }, { status: 201 });
}
