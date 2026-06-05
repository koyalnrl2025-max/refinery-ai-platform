import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('model_configs')
    .select('id, name, description, provider, model_id, active, is_primary')
    .order('is_primary', { ascending: false });

  return NextResponse.json(data ?? []);
}
