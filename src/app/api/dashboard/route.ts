import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().split('T')[0];

  const [statsRow, prevStatsRow, docsCount, activeUsers, recentQueries, documents, activity] = await Promise.all([
    supabase.from('query_stats').select('*').eq('date', today).single(),
    supabase.from('query_stats').select('*').eq('date', new Date(Date.now() - 86400000).toISOString().split('T')[0]).single(),
    supabase.from('documents').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('enabled', true),
    supabase.from('messages')
      .select('content, sentiment, created_at, conversations(dept)')
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('documents').select('dept, chunks').eq('status', 'indexed'),
    supabase.from('audit_logs')
      .select('action, resource, created_at, user_name')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const todayQueries = statsRow.data?.total_queries ?? 0;
  const prevQueries = prevStatsRow.data?.total_queries ?? 0;
  const queryDelta = prevQueries > 0 ? Math.round(((todayQueries - prevQueries) / prevQueries) * 100) : 0;

  const avgResponseMs = statsRow.data?.avg_response_ms ?? 1400;

  // Coverage: group chunks by dept
  const coverage: Record<string, number> = {};
  const deptTotals: Record<string, number> = {};
  documents.data?.forEach((d: { dept: string; chunks: number }) => {
    deptTotals[d.dept] = (deptTotals[d.dept] ?? 0) + d.chunks;
  });
  const maxChunks = Math.max(...Object.values(deptTotals), 1);
  const DEPT_NAMES: Record<string, string> = {
    safety: 'Safety & HSE', crude: 'Crude Distillation', fcc: 'FCC Operations',
    hydro: 'Hydroprocessing', utilities: 'Utilities', maintenance: 'Maintenance', lab: 'Laboratory',
  };
  Object.entries(deptTotals).forEach(([dept, chunks]) => {
    if (dept !== 'all') coverage[DEPT_NAMES[dept] ?? dept] = Math.min(Math.round((chunks / maxChunks) * 100), 99);
  });

  return NextResponse.json({
    stats: {
      queriesToday: todayQueries,
      queryDelta,
      avgResponseMs,
      docsIndexed: docsCount.count ?? 0,
      activeUsers: activeUsers.count ?? 0,
    },
    coverage: Object.entries(coverage)
      .map(([name, pct]) => ({ name, pct }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 7),
    recentQueries: (recentQueries.data ?? []).map((m: Record<string, unknown>) => ({
      text: m.content as string,
      dept: ((m.conversations as Record<string, unknown>)?.dept as string)?.toUpperCase() ?? 'ALL',
      sentiment: (m.sentiment as string) ?? 'neu',
      time: formatTime(m.created_at as string),
    })),
    activity: (activity.data ?? []).map((a: Record<string, unknown>) => ({
      text: `${a.action}${a.resource ? ' — ' + a.resource : ''}`,
      user: a.user_name as string,
      time: formatTime(a.created_at as string),
    })),
  });
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)} days ago`;
}
