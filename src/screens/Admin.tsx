'use client';

import { useState } from 'react';
import { USERS, DOCS, ADMIN_NAV } from '@/lib/data';
import Avatar from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import StatusChip from '@/components/StatusChip';
import Toggle from '@/components/Toggle';
import { I, SearchIcon, PlusIcon, UploadIcon, FilterIcon, DotsIcon, DocIcon } from '@/components/icons';
import type { Role } from '@/lib/types';

export default function Admin() {
  const [activeNav, setActiveNav] = useState('users');
  const [search, setSearch] = useState('');
  const [userEnabled, setUserEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(USERS.map(u => [u.id, u.enabled]))
  );
  const [docSeg, setDocSeg] = useState('all');

  const filteredUsers = USERS.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  function renderContent() {
    switch (activeNav) {
      case 'users':
        return (
          <>
            <div className="toolbar">
              <div className="search-box">
                <SearchIcon />
                <input
                  placeholder="Search users…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="spacer" />
              <button className="btn">
                <FilterIcon />
                Filter
              </button>
              <button className="btn btn-primary">
                <PlusIcon />
                Add User
              </button>
            </div>
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Queries</th>
                    <th>Last Seen</th>
                    <th>Active</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="u-cell">
                          <Avatar name={u.name} size={34} />
                          <div>
                            <div className="u-name">{u.name}</div>
                            <div className="u-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={u.role as Role} /></td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{u.dept}</td>
                      <td><StatusChip status={u.status} /></td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{u.queries}</td>
                      <td style={{ color: 'var(--text-faint)', fontSize: 13 }}>{u.lastSeen}</td>
                      <td>
                        <Toggle
                          on={userEnabled[u.id] ?? u.enabled}
                          onChange={v => setUserEnabled(prev => ({ ...prev, [u.id]: v }))}
                        />
                      </td>
                      <td>
                        <button className="ai-act">
                          <DotsIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        );

      case 'docs':
        return (
          <>
            <div className="toolbar">
              <div className="search-box">
                <SearchIcon />
                <input placeholder="Search documents…" />
              </div>
              <div className="seg">
                {['all', 'indexed', 'processing'].map(s => (
                  <button
                    key={s}
                    className={docSeg === s ? 'active' : ''}
                    onClick={() => setDocSeg(s)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="spacer" />
              <button className="btn btn-primary">
                <UploadIcon />
                Upload Doc
              </button>
            </div>
            {DOCS.filter(d => docSeg === 'all' || d.status === docSeg).map(doc => (
              <div className="doc-row" key={doc.id}>
                <div className="doc-ico">
                  <DocIcon />
                </div>
                <div>
                  <div className="doc-name">{doc.name}</div>
                  <div className="doc-meta">{doc.dept} · {doc.size} · {doc.chunks} chunks</div>
                </div>
                <div className="doc-cols">
                  <span className={`chip${doc.status === 'processing' ? '' : ''}`} style={{
                    color: doc.status === 'indexed' ? 'var(--green)' : doc.status === 'processing' ? 'var(--amber)' : 'var(--red)',
                    borderColor: doc.status === 'indexed' ? 'rgba(52,211,153,0.3)' : doc.status === 'processing' ? 'rgba(251,191,36,0.3)' : 'rgba(251,113,133,0.3)',
                    background: doc.status === 'indexed' ? 'rgba(52,211,153,0.08)' : doc.status === 'processing' ? 'rgba(251,191,36,0.08)' : 'rgba(251,113,133,0.08)',
                  }}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{doc.updated}</span>
                  <button className="ai-act"><DotsIcon /></button>
                </div>
              </div>
            ))}
          </>
        );

      case 'models':
        return (
          <div className="panel">
            <div className="panel-h">
              <span className="card-h">AI Model Configuration</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { name: 'RefineIQ-4o', desc: 'Primary model — optimised for refinery domain', active: true },
                { name: 'GPT-4o', desc: 'OpenAI fallback model', active: false },
                { name: 'Claude 3.5 Sonnet', desc: 'Anthropic model for complex reasoning', active: true },
              ].map((m, i) => (
                <div key={i} className="doc-row" style={{ alignItems: 'center' }}>
                  <div className="doc-ico" style={{ background: 'linear-gradient(135deg, var(--a1-soft), var(--a2-soft))' }}>
                    {I('Sparkle')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="doc-name">{m.name}</div>
                    <div className="doc-meta">{m.desc}</div>
                  </div>
                  <Toggle on={m.active} onChange={() => {}} />
                </div>
              ))}
            </div>
          </div>
        );

      case 'logs':
        return (
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: '14:32:01', user: 'Sarah Mitchell', action: 'Document upload', resource: 'CDU Manual v4.2', ip: '10.0.1.44' },
                  { time: '14:28:15', user: 'James Okafor', action: 'Query submitted', resource: 'Chat session', ip: '10.0.1.22' },
                  { time: '14:20:09', user: 'Layla Al-Farsi', action: 'User settings changed', resource: 'User: Hamad', ip: '10.0.1.31' },
                  { time: '13:58:44', user: 'System', action: 'Model retrained', resource: 'RefineIQ-4o', ip: 'localhost' },
                  { time: '13:45:20', user: 'Priya Nair', action: 'Export report', resource: 'Q2 KPIs', ip: '10.0.1.55' },
                ].map((log, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>{log.time}</td>
                    <td>{log.user}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{log.action}</td>
                    <td style={{ color: 'var(--text-faint)', fontSize: 13 }}>{log.resource}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-ghost)' }}>{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'settings':
        return (
          <div className="panel">
            <div className="panel-h">
              <span className="card-h">Platform Settings</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Enable AI response streaming', desc: 'Stream tokens as they are generated', on: true },
                { label: 'Citation extraction', desc: 'Automatically extract document citations', on: true },
                { label: 'Sentiment analysis', desc: 'Analyse query sentiment in real time', on: true },
                { label: 'Audit logging', desc: 'Log all user actions for compliance', on: true },
                { label: 'Email notifications', desc: 'Send daily digest to administrators', on: false },
                { label: 'Multi-language support', desc: 'Enable Arabic and French UI', on: false },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{s.desc}</div>
                  </div>
                  <Toggle on={s.on} onChange={() => {}} />
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="admin-wrap">
      <div className="admin-nav">
        <div className="side-section-label">Admin</div>
        {ADMIN_NAV.map(item => (
          <button
            key={item.id}
            className={`nav-item${activeNav === item.id ? ' active' : ''}`}
            onClick={() => setActiveNav(item.id)}
          >
            {I(item.icon)}
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="admin-content">
        {renderContent()}
      </div>
    </div>
  );
}
