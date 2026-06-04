'use client';

import { STATS, COVERAGE, ACTIVITY, RECENT_Q } from '@/lib/data';
import { I } from '@/components/icons';
import Sentiment from '@/components/Sentiment';
import ModelBadge from '@/components/ModelBadge';

export default function Dashboard() {
  return (
    <div className="page">
      <div className="page-inner">
        <div className="stat-grid">
          {STATS.map((stat, i) => (
            <div className="stat" key={i}>
              <div className="stat-top">
                <div className="stat-ico">
                  {I(stat.icon)}
                </div>
                <span className={`stat-delta ${stat.up ? 'delta-up' : 'delta-down'}`}>
                  {stat.delta}
                </span>
              </div>
              <div className="stat-val">{stat.value}</div>
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
              {COVERAGE.map((item, i) => (
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
                {RECENT_Q.map((q, i) => (
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
                {ACTIVITY.map((item, i) => (
                  <div className="feed-item" key={i}>
                    <div className="feed-ico">
                      {I(item.icon)}
                    </div>
                    <div>
                      <div className="feed-text">{item.text}</div>
                      <div className="feed-time">{item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="ai-card" style={{ marginTop: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span className="ai-grad" style={{ fontSize: 13, fontWeight: 600 }}>AI Insight</span>
                <ModelBadge model="GPT-4o" />
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: 'var(--text)' }}>FCC regenerator temperature</strong> has shown
                3 anomalous spikes in the last 6 hours. Cross-referencing with catalyst inventory
                records suggests a possible catalyst circulation issue. Recommend immediate review
                of slide valve differential pressure.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <span className="chip">
                  <span className="sent neg" />
                  High priority
                </span>
                <span className="chip">FCC · 6h window</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
