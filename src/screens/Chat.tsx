'use client';

import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { DEPT_CONTENT } from '@/lib/data';
import Avatar from '@/components/Avatar';
import ModelBadge from '@/components/ModelBadge';
import { SparkleIcon, SendIcon, AttachIcon, CopyIcon, ThumbIcon, RefreshIcon, DocIcon } from '@/components/icons';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  citations?: { doc: string; page: string }[];
  streaming?: boolean;
}

const INITIAL_AI: Message = {
  id: 'ai-0',
  role: 'ai',
  content: `I'm your AI-powered refinery operations assistant. I have access to your operational manuals, SOPs, HSE procedures, and engineering documents.\n\nI can help you with process troubleshooting, procedure lookup, safety compliance, maintenance planning, and operational optimization.`,
};

const SAMPLE_RESPONSES: Record<string, { content: string; citations: { doc: string; page: string }[] }> = {
  default: {
    content: `Based on your operational documents, here is what I found:\n\n**Key findings:**\n- The relevant procedures are documented in section 4.2 of the operating manual\n- Safety interlocks are configured per IEC 61511 functional safety standards\n- Last calibration check was performed 14 days ago\n\nWould you like me to pull up the detailed step-by-step procedure, or do you need the emergency shutdown sequence?`,
    citations: [
      { doc: 'CDU Operating Manual v4.2', page: 'p.84' },
      { doc: 'HSE Procedures 2024', page: 'p.12' },
    ],
  },
};

export default function Chat() {
  const { dept, currentUser } = useApp();
  const [messages, setMessages] = useState<Message[]>([INITIAL_AI]);
  const [input, setInput] = useState('');
  const [focused, setFocused] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const content = DEPT_CONTENT[dept] ?? DEPT_CONTENT['all'];
  const hasMessages = messages.length > 1;

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

  function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || streaming) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: msg };
    const aiId = `ai-${Date.now()}`;
    const aiMsg: Message = { id: aiId, role: 'ai', content: '', streaming: true };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setStreaming(true);

    const response = SAMPLE_RESPONSES['default'];
    let i = 0;
    const chars = response.content;

    const interval = setInterval(() => {
      i += 4;
      setMessages(prev =>
        prev.map(m =>
          m.id === aiId
            ? { ...m, content: chars.slice(0, i), streaming: i < chars.length }
            : m
        )
      );
      if (i >= chars.length) {
        clearInterval(interval);
        setMessages(prev =>
          prev.map(m =>
            m.id === aiId
              ? { ...m, content: chars, streaming: false, citations: response.citations }
              : m
          )
        );
        setStreaming(false);
      }
    }, 16);
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
                      <Avatar name={currentUser.name} size={32} />
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
                                <span className="pg">{c.page}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {!msg.streaming && (
                          <div className="ai-foot">
                            <ModelBadge />
                            <div className="ai-actions">
                              <button className="ai-act"><CopyIcon /></button>
                              <button className="ai-act"><ThumbIcon /></button>
                              <button className="ai-act"><RefreshIcon /></button>
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
              <button className="attach-btn">
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
