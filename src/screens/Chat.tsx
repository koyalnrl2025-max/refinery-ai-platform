'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { createClient } from '@/lib/supabase/client';
import { DEPT_CONTENT } from '@/lib/data';
import Avatar from '@/components/Avatar';
import ModelBadge from '@/components/ModelBadge';
import { SparkleIcon, SendIcon, AttachIcon, CopyIcon, ThumbIcon, RefreshIcon, DocIcon, PlusIcon } from '@/components/icons';

type Provider = 'ollama' | 'anthropic' | 'openai';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: { doc: string; page: string }[];
  streaming?: boolean;
  provider?: Provider;
  modelId?: string;
  ragChunks?: number;
}

interface Conversation {
  id: string;
  title: string;
  dept: string;
  updated_at: string;
}

const INITIAL_AI: Message = {
  id: 'ai-0',
  role: 'ai',
  content: `I'm your AI-powered refinery operations assistant. I have access to your operational manuals, SOPs, HSE procedures, and engineering documents.\n\nI can help you with process troubleshooting, procedure lookup, safety compliance, maintenance planning, and operational optimization.`,
};

export default function Chat() {
  const { dept, currentUser } = useApp();
  const [messages, setMessages] = useState<Message[]>([INITIAL_AI]);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const content = DEPT_CONTENT[dept] ?? DEPT_CONTENT['all'];
  const hasMessages = messages.length > 1;

  // Load conversations list
  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then(data => { setConversations(Array.isArray(data) ? data : []); setLoadingConvs(false); })
      .catch(() => setLoadingConvs(false));
  }, []);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages]);

  function autoResize() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function startNewConversation() {
    setConversationId(null);
    setMessages([INITIAL_AI]);
  }

  async function loadConversation(conv: Conversation) {
    setConversationId(conv.id);
    const res = await fetch(`/api/conversations/${conv.id}`);
    const msgs = await res.json();
    const formatted: Message[] = [INITIAL_AI, ...msgs.map((m: any) => ({
      id: m.id,
      role: m.role as 'user' | 'ai',
      content: m.content,
      citations: m.citations ?? [],
    }))];
    setMessages(formatted);
  }

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: msg };
    const aiId = `ai-${Date.now()}`;
    const aiMsg: Message = { id: aiId, role: 'ai', content: '', streaming: true };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setStreaming(true);

    try {
      // Get current session token — needed by both the local API route
      // and the Cloudflare Pages Function (which can't read cookies)
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: msg, conversationId, dept }),
      });

      if (!res.ok || !res.body) throw new Error('Chat API error');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let citations: { doc: string; page: string }[] = [];
      let activeProvider: Provider | undefined;
      let activeModelId: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === 'conv_id' && event.id) {
              setConversationId(event.id);
              setConversations(prev => {
                const exists = prev.some(c => c.id === event.id);
                if (!exists) {
                  return [{ id: event.id, title: msg.slice(0, 50), dept: dept ?? 'all', updated_at: new Date().toISOString() }, ...prev];
                }
                return prev;
              });
            } else if (event.type === 'context') {
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, ragChunks: event.chunks } : m
              ));
            } else if (event.type === 'model') {
              activeProvider = event.provider as Provider;
              activeModelId = event.modelId;
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, provider: activeProvider, modelId: activeModelId } : m
              ));
            } else if (event.type === 'delta') {
              fullText += event.text;
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, content: fullText, streaming: true } : m
              ));
            } else if (event.type === 'done') {
              citations = event.citations ?? [];
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, content: fullText, streaming: false, citations, provider: event.provider, modelId: event.modelId } : m
              ));
            } else if (event.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.id === aiId ? { ...m, content: 'Sorry, all AI providers are currently unavailable. Please try again later.', streaming: false } : m
              ));
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: 'Connection error. Please check your configuration and try again.', streaming: false } : m
      ));
    } finally {
      setStreaming(false);
    }
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
  }

  function formatTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(iso).toLocaleDateString();
  }

  return (
    <div className="chat-wrap">
      <div className="chat-thread" ref={threadRef}>
        <div className="thread-inner">
          {!hasMessages ? (
            <div className="chat-empty">
              <div className="empty-orb">
                <SparkleIcon />
              </div>
              <div className="empty-title">What can I help you with?</div>
              <div className="empty-sub">{content.placeholder}</div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`msg ${msg.role}`}>
                {msg.role === 'user' ? (
                  <>
                    <div className="m-av">
                      <Avatar name={currentUser?.name ?? 'User'} size={32} />
                    </div>
                    <div className="bubble">{msg.content}</div>
                  </>
                ) : (
                  <>
                    <div className="m-av">
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--accent-grad)', display: 'grid', placeItems: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
                        <SparkleIcon style={{ width: 16, height: 16, color: 'white' }} />
                      </div>
                    </div>
                    <div className="bubble-wrap">
                      <div className={`ai-card${msg.streaming ? ' streaming' : ''}`}>
                        <div className="ai-body">
                          {msg.streaming && msg.content === '' ? (
                            <div>
                              <div className="shimmer-line" style={{ width: '80%' }} />
                              <div className="shimmer-line" style={{ width: '60%' }} />
                              <div className="shimmer-line" style={{ width: '70%' }} />
                            </div>
                          ) : (
                            <div>
                              {msg.content.split('\n\n').map((para, pi) => {
                                if (para.startsWith('**') && para.endsWith('**')) {
                                  return <p key={pi}><strong>{para.slice(2, -2)}</strong></p>;
                                }
                                if (para.includes('\n- ')) {
                                  const parts = para.split('\n');
                                  return (
                                    <div key={pi}>
                                      {parts[0] && <p><strong>{parts[0].replace(/\*\*/g, '')}</strong></p>}
                                      <ul>
                                        {parts.slice(1).filter(l => l.startsWith('- ')).map((line, li) => (
                                          <li key={li}>{line.slice(2)}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  );
                                }
                                return <p key={pi}>{para.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
                              })}
                              {msg.streaming && (
                                <span className="think">
                                  <i /><i /><i />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="cite-row">
                            {msg.citations.map((c, ci) => (
                              <span key={ci} className="cite">
                                <DocIcon />
                                {c.doc}
                                {c.page && <span className="pg">{c.page}</span>}
                              </span>
                            ))}
                          </div>
                        )}
                        {!msg.streaming && msg.id !== 'ai-0' && (
                          <div className="ai-foot">
                            {msg.ragChunks !== undefined && (
                              <span className="model-badge" style={{
                                fontSize: 11,
                                color: msg.ragChunks > 0 ? 'var(--green)' : 'var(--amber)',
                                borderColor: msg.ragChunks > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)',
                                background:  msg.ragChunks > 0 ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)',
                              }}>
                                {msg.ragChunks > 0 ? `📄 ${msg.ragChunks} doc chunk${msg.ragChunks > 1 ? 's' : ''}` : '⚠ No docs matched'}
                              </span>
                            )}
                            <ProviderBadge provider={msg.provider} modelId={msg.modelId} />
                            <div className="ai-actions">
                              <button className="ai-act" onClick={() => copyMessage(msg.content)} title="Copy"><CopyIcon /></button>
                              <button className="ai-act" title="Thumbs up"><ThumbIcon /></button>
                              <button className="ai-act" onClick={() => send(messages[messages.indexOf(msg) - 1]?.content)} title="Regenerate"><RefreshIcon /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="composer">
        <div className="composer-inner">
          {!hasMessages && (
            <div className="suggest-row">
              {content.suggestions.map((s, i) => (
                <button key={i} className="suggest" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          )}
          <div className={`input-shell${focused ? ' active' : ''}`}>
            <div className="composer-row">
              <button className="attach-btn" title="Attach file (coming soon)">
                <AttachIcon />
              </button>
              <textarea
                ref={textareaRef}
                placeholder={content.placeholder}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={streaming}
              />
              <button
                className="send-btn"
                disabled={!input.trim() || streaming}
                onClick={() => send()}
              >
                <SendIcon />
              </button>
            </div>
            <div className="composer-meta">
              <ModelBadge />
              <span className="composer-hint">⏎ Send · Shift+⏎ newline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  ollama:    { label: '🖥 Local (Ollama)',   color: 'var(--green)' },
  anthropic: { label: '☁ Anthropic',         color: '#a78bfa' },
  openai:    { label: '☁ OpenAI',            color: '#60a5fa' },
};

function ProviderBadge({ provider, modelId }: { provider?: Provider; modelId?: string }) {
  if (!provider) return <span className="model-badge">RefineIQ</span>;
  const { label, color } = PROVIDER_LABELS[provider] ?? { label: provider, color: 'var(--text-faint)' };
  return (
    <span className="model-badge" style={{ color, borderColor: `${color}40`, background: `${color}10`, fontSize: 11 }}>
      {label}{modelId ? ` · ${modelId}` : ''}
    </span>
  );
}
