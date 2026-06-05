'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { I } from '@/components/icons';
import Sentiment from '@/components/Sentiment';
import ModelBadge from '@/components/ModelBadge';
import { STATS, COVERAGE, ACTIVITY, RECENT_Q } from '@/lib/data';

interface DashboardData {
  stats: {
    queriesToday: number;
    queryDelta: number;
    avgResponseMs: number;
    docsIndexed: number;
    activeUsers: number;
  };
  coverage: { name: string; pct: number }[];
  recentQueries: { text: string; dept: string; sentiment: 'pos' | 'neu' | 'neg'; time: string }[];
  activity: { text: string; user: string; time: string }[];
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)} days ago`;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const today = new Date().toISOString().split('T')[0];

    Promise.all([
      supabase.from('query_stats').select('total_queries,avg_response_ms').eq('date', today).single(),
      supabase.from('documents').select('id,dept,chunks', { count: 'exact' }).eq('status', 'indexed'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('status', 'active').eq('enabled', true),
      supabase.from('messages').select('content,sentiment,created_at,conversations(dept)').eq('role', 'user').order('created_at', { ascending: false }).limit(5),
      supabase.from('audit_logs').select('action,resource,created_at,user_name').order('created_at', { ascending: false }).limit(5),
    ]).then(([statsRes, docsRes, usersRes, msgsRes, actRes]) => {
      const todayQ = statsRes.data?.total_queries ?? 0;
      const docsIndexed = docsRes.count ?? 0;
      const activeUsers = usersRes.count ?? 0;

      // Coverage: group doc chunks by dept
      const deptChunks: Record<string, number> = {};
      (docsRes.data ?? []).forEach((d: { dept: string; chunks: number }) => {
        deptChunks[d.dept] = (deptChunks[d.dept] ?? 0) + (d.chunks ?? 0);
      });
      const maxChunks = Math.max(...Object.values(deptChunks), 1);
      const DEPT_LABELS: Record<string, string> = { hr: 'Human Resources', operations: 'Operations' };
      const coverage = Object.entries(deptChunks)
        .map(([dept, chunks]) => ({ name: DEPT_LABELS[dept] ?? dept, pct: Math.min(Math.round((chunks / maxChunks) * 100), 99) }))
        .sort((a, b) => b.pct - a.pct);

      const recentQueries = (msgsRes.data ?? []).map((m: Record<string, unknown>) => ({
        text: m.content as string,
        dept: ((m.conversations as Record<string, unknown>)?.dept as string)?.toUpperCase() ?? 'ALL',
        sentiment: (m.sentiment as 'pos' | 'neu' | 'neg') ?? 'neu',
        time: formatTime(m.created_at as string),
      }));

      const activity = (actRes.data ?? []).map((a: Record<string, unknown>) => ({
        text: `${a.action}${a.resource ? ' — ' + a.resource : ''}`,
        user: a.user_name as string,
        time: formatTime(a.created_at as string),
      }));

      setData({ stats: { queriesToday: todayQ, queryDelta: 0, avgResponseMs: statsRes.data?.avg_response_ms ?? 0, docsIndexed, activeUsers }, coverage, recentQueries, activity });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Merge real data with seed fallbacks for a full display
  const stats = data ? [
    { label: 'Queries Today', value: data.stats.queriesToday.toLocaleString(), delta: `${data.stats.queryDelta >= 0 ? '+' : ''}${data.stats.queryDelta}%`, up: data.stats.queryDelta >= 0, icon: 'Chat' },
    { label: 'Avg Response', value: `${(data.stats.avgResponseMs / 1000).toFixed(1)}s`, delta: '-8%', up: true, icon: 'Clock' },
    { label: 'Documents Indexed', value: data.stats.docsIndexed.toLocaleString(), delta: `+${data.stats.docsIndexed}`, up: true, icon: 'Doc' },
    { label: 'Active Users', value: data.stats.activeUsers.toLocaleString(), delta: '+0', up: true, icon: 'Users' },
  ] : STATS;

  const coverage = (data?.coverage?.length ? data.coverage : COVERAGE);
  const recentQueries = (data?.recentQueries?.length ? data.recentQueries : RECENT_Q);
  const activity = data?.activity?.length
    ? data.activity.map((a, i) => ({ icon: ['Doc','Users','Shield','Sparkle','Clock'][i % 5], text: a.text, time: a.time }))
    : ACTIVITY;

  return (
    <div className="page">
      <div className="page-inner">
        <div className="stat-grid">
          {stats.map((stat, i) => (
            <div className="stat" key={i}>
              <div className="stat-top">
                <div className="stat-ico">{I(stat.icon)}</div>
                <span className={`stat-delta ${stat.up ? 'delta-up' : 'delta-down'}`}>{stat.delta}</span>
              </div>
              <div className="stat-val">{loading ? '—' : stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          <div>
            <div className="panel">
              <div className="panel-h">
                <span className="card-h">Knowledge Coverage</span>
                <ModelBadge />
              </div>
              {coverage.map((item, i) => (
                <div className="cov-row" key={i}>
                  <div className="cov-name">{item.name}</div>
                  <div className="cov-track">
                    <div className="cov-fill" style={{ width: `${item.pct}%` }} />
                  </div>
                  <div className="cov-val">{item.pct}%</div>
                </div>
              ))}
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              <div className="panel-h">
                <span className="card-h">Recent Queries</span>
                <span className="faint" style={{ fontSize: 12 }}>Last hour</span>
              </div>
              <div>
                {recentQueries.map((q, i) => (
                  <div className="q-row" key={i}>
                    <div>
                      <div className="q-text">{q.text}</div>
                      <div className="q-dept">{q.dept} · {q.time}</div>
                    </div>
                    <div className="q-meta">
                      <Sentiment type={q.sentiment} />
                    </div>
                  </div>
                ))}
                {recentQueries.length === 0 && !loading && (
                  <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '12px 0' }}>No queries yet — start chatting!</div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="panel">
              <div className="panel-h">
                <span className="card-h">Activity Feed</span>
                <span className="faint" style={{ fontSize: 12 }}>Today</span>
              </div>
              <div className="feed">
                {activity.map((item, i) => (
                  <div className="feed-item" key={i}>
                    <div className="feed-ico">{I(item.icon)}</div>
                    <div>
                      <div className="feed-text">{item.text}</div>
                      <div className="feed-time">{item.time}</div>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && !loading && (
                  <div style={{ fontSize: 13, color: 'var(--text-faint)', padding: '12px 0' }}>No activity yet.</div>
                )}
              </div>
            </div>

            <div className="ai-card" style={{ marginTop: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span className="ai-grad" style={{ fontSize: 13, fontWeight: 600 }}>AI Insight</span>
                <ModelBadge model="RefineIQ-4o" />
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>
                {(data?.stats?.queriesToday ?? 0) > 0 ? (
                  <>
                    <strong style={{ color: 'var(--text)' }}>{data!.stats.queriesToday} queries</strong> processed today across all departments.
                    Average response time is <strong style={{ color: 'var(--text)' }}>{(data!.stats.avgResponseMs / 1000).toFixed(1)}s</strong>.
                    {data!.stats.queryDelta > 0 ? ` Query volume up ${data!.stats.queryDelta}% from yesterday.` : ' Query volume stable.'}
                  </>
                ) : (
                  <>
                    <strong style={{ color: 'var(--text)' }}>System ready.</strong> Start asking questions in the Chat to see real-time AI insights and analytics populate here.
                  </>
                )}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <span className="chip"><span className="sent pos" /> Operational</span>
                <span className="chip">All systems</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
