'use client';

import { useState, useEffect, useCallback } from 'react';
import Avatar from '@/components/Avatar';
import RoleBadge from '@/components/RoleBadge';
import StatusChip from '@/components/StatusChip';
import Toggle from '@/components/Toggle';
import { ADMIN_NAV, DEPARTMENTS } from '@/lib/data';
import { I, SearchIcon, PlusIcon, UploadIcon, FilterIcon, DotsIcon, DocIcon } from '@/components/icons';
import type { Role } from '@/lib/types';

interface UserRow {
  id: string; name: string; email: string; role: Role;
  dept: string; status: 'active' | 'idle' | 'off';
  last_seen: string; queries: number; enabled: boolean;
}
interface DocRow {
  id: string; name: string; dept: string; file_size: string;
  chunks: number; status: 'indexed' | 'processing' | 'error'; updated_at: string;
}
interface AuditRow {
  id: string; user_name: string; action: string;
  resource: string; ip_address: string; created_at: string;
}
interface SettingRow { key: string; label: string; description: string; enabled: boolean; }
interface ModelRow { id: string; name: string; description: string; provider: string; active: boolean; is_primary: boolean; }

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)} days ago`;
}

export default function Admin() {
  const [activeNav, setActiveNav] = useState('users');
  const [search, setSearch] = useState('');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [docSeg, setDocSeg] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const loadData = useCallback(async (section: string) => {
    setLoading(true);
    try {
      if (section === 'users') {
        const res = await fetch(`/api/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
        setUsers(await res.json());
      } else if (section === 'docs') {
        const res = await fetch(`/api/documents${docSeg !== 'all' ? `?status=${docSeg}` : ''}`);
        setDocs(await res.json());
      } else if (section === 'logs') {
        const res = await fetch('/api/audit-logs');
        setAuditLogs(await res.json());
      } else if (section === 'settings') {
        const res = await fetch('/api/settings');
        setSettings(await res.json());
      } else if (section === 'models') {
        const res = await fetch('/api/models');
        setModels(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [search, docSeg]);

  useEffect(() => { loadData(activeNav); }, [activeNav, loadData]);

  async function toggleUser(id: string, enabled: boolean) {
    await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, enabled } : u));
  }

  async function toggleSetting(key: string, enabled: boolean) {
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, enabled }) });
    setSettings(prev => prev.map(s => s.key === key ? { ...s, enabled } : s));
  }

  async function toggleModel(id: string, active: boolean) {
    await fetch(`/api/models/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active }) });
    setModels(prev => prev.map(m => m.id === id ? { ...m, active } : m));
  }

  async function deleteDoc(id: string) {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    setDocs(prev => prev.filter(d => d.id !== id));
  }

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
                  onKeyDown={e => e.key === 'Enter' && loadData('users')}
                />
              </div>
              <div className="spacer" />
              <button className="btn" onClick={() => loadData('users')}><FilterIcon /> Refresh</button>
              <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
                <PlusIcon /> Add User
              </button>
            </div>
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th><th>Role</th><th>Department</th><th>Status</th>
                    <th>Queries</th><th>Last Seen</th><th>Active</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24 }}>Loading…</td></tr>
                  )}
                  {!loading && users.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24 }}>No users found. Invite someone to get started.</td></tr>
                  )}
                  {users.map(u => (
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
                      <td><RoleBadge role={u.role} /></td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{u.dept}</td>
                      <td><StatusChip status={u.status} /></td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{u.queries}</td>
                      <td style={{ color: 'var(--text-faint)', fontSize: 13 }}>{u.last_seen ? formatTime(u.last_seen) : '—'}</td>
                      <td><Toggle on={u.enabled} onChange={v => toggleUser(u.id, v)} /></td>
                      <td><button className="ai-act"><DotsIcon /></button></td>
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
                <input placeholder="Search documents…" onKeyDown={e => e.key === 'Enter' && loadData('docs')} />
              </div>
              <div className="seg">
                {['all', 'indexed', 'processing'].map(s => (
                  <button key={s} className={docSeg === s ? 'active' : ''} onClick={() => setDocSeg(s)}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="spacer" />
              <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                <UploadIcon /> Upload Doc
              </button>
            </div>
            {loading && <div style={{ padding: 24, color: 'var(--text-faint)', fontSize: 13 }}>Loading…</div>}
            {!loading && docs.length === 0 && (
              <div style={{ padding: 24, color: 'var(--text-faint)', fontSize: 13 }}>No documents yet. Upload your first document.</div>
            )}
            {docs.map(doc => (
              <div className="doc-row" key={doc.id}>
                <div className="doc-ico"><DocIcon /></div>
                <div>
                  <div className="doc-name">{doc.name}</div>
                  <div className="doc-meta">{doc.dept?.toUpperCase()} · {doc.file_size} · {doc.chunks} chunks</div>
                </div>
                <div className="doc-cols">
                  <span className="chip" style={{
                    color: doc.status === 'indexed' ? 'var(--green)' : doc.status === 'processing' ? 'var(--amber)' : 'var(--red)',
                    borderColor: doc.status === 'indexed' ? 'rgba(52,211,153,0.3)' : doc.status === 'processing' ? 'rgba(251,191,36,0.3)' : 'rgba(251,113,133,0.3)',
                    background: doc.status === 'indexed' ? 'rgba(52,211,153,0.08)' : doc.status === 'processing' ? 'rgba(251,191,36,0.08)' : 'rgba(251,113,133,0.08)',
                  }}>
                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{doc.updated_at ? formatTime(doc.updated_at) : '—'}</span>
                  <button className="ai-act" onClick={() => deleteDoc(doc.id)}><DotsIcon /></button>
                </div>
              </div>
            ))}
          </>
        );

      case 'models':
        return (
          <div className="panel">
            <div className="panel-h"><span className="card-h">AI Model Configuration</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {loading && <div style={{ color: 'var(--text-faint)', fontSize: 13 }}>Loading…</div>}
              {models.map(m => (
                <div key={m.id} className="doc-row" style={{ alignItems: 'center' }}>
                  <div className="doc-ico" style={{ background: 'linear-gradient(135deg, var(--a1-soft), var(--a2-soft))' }}>
                    {I('Sparkle')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="doc-name">{m.name}{m.is_primary && <span className="chip" style={{ marginLeft: 8, fontSize: 10 }}>Primary</span>}</div>
                    <div className="doc-meta">{m.description}</div>
                  </div>
                  <Toggle on={m.active} onChange={v => toggleModel(m.id, v)} />
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
                <tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>IP</th></tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24 }}>Loading…</td></tr>}
                {!loading && auditLogs.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-faint)', padding: 24 }}>No audit logs yet.</td></tr>
                )}
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td>{log.user_name ?? 'System'}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{log.action}</td>
                    <td style={{ color: 'var(--text-faint)', fontSize: 13 }}>{log.resource}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-ghost)' }}>{log.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'settings':
        return (
          <div className="panel">
            <div className="panel-h"><span className="card-h">Platform Settings</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {loading && <div style={{ color: 'var(--text-faint)', fontSize: 13, padding: '12px 0' }}>Loading…</div>}
              {settings.map((s, i) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: i < settings.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>{s.description}</div>
                  </div>
                  <Toggle on={s.enabled} onChange={v => toggleSetting(s.key, v)} />
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
    <>
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
        <div className="admin-content">{renderContent()}</div>
      </div>

      {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} onSuccess={() => { setShowInviteModal(false); loadData('users'); }} />}
      {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} onSuccess={() => { setShowUploadModal(false); loadData('docs'); }} />}
    </>
  );
}

function InviteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'user', dept: 'all' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Failed to invite user'); return; }
    onSuccess();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="panel" style={{ width: 420, padding: 28 }}>
        <div className="panel-h" style={{ marginBottom: 20 }}><span className="card-h">Invite User</span></div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field"><label>Full Name</label><input placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div className="field"><label>Work Email</label><input type="email" placeholder="jane@refinery.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13.5 }}>
              <option value="user">User</option>
              <option value="mgr">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field">
            <label>Department</label>
            <select value={form.dept} onChange={e => setForm(f => ({ ...f, dept: e.target.value }))} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13.5 }}>
              {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {error && <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>{loading ? 'Sending…' : 'Send Invite'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [dept, setDept] = useState('crude');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('dept', dept);
    const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? 'Upload failed'); return; }
    onSuccess();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="panel" style={{ width: 420, padding: 28 }}>
        <div className="panel-h" style={{ marginBottom: 20 }}><span className="card-h">Upload Document</span></div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Department</label>
            <select value={dept} onChange={e => setDept(e.target.value)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: 13.5 }}>
              {DEPARTMENTS.filter(d => d.id !== 'all').map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>File (PDF, DOCX, TXT)</label>
            <input type="file" accept=".pdf,.docx,.txt,.doc" onChange={e => setFile(e.target.files?.[0] ?? null)} required style={{ fontSize: 13 }} />
          </div>
          {error && <div style={{ fontSize: 12.5, color: 'var(--red)' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !file} style={{ flex: 1 }}>{loading ? 'Uploading…' : 'Upload'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
