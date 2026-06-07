'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles, Calendar, BarChart2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function AICopilot() {
  const { profile, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [localInput, setLocalInput] = useState('');
  const [messages, setMessages] = useState<{ id: string, role: string, content: string, results?: any }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim() || isLoading) return;
    
    const userMsg = { id: Date.now().toString(), role: 'user', content: localInput };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLocalInput('');
    setIsLoading(true);

    try {
      const userRole = profile?.role || 'student';

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           messages: newMessages.map(m => ({ role: m.role, content: m.content })), 
           userRole,
           uid: user?.uid 
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.summary) {
        setMessages([...newMessages, { 
           id: (Date.now()+1).toString(), 
           role: 'assistant', 
           content: data.summary,
           results: data.results
        }]);
      } else {
        setMessages([...newMessages, { id: (Date.now()+1).toString(), role: 'assistant', content: "Sorry, I encountered an error. Details: " + (data.details || data.error || "Unknown Error") }]);
      }
    } catch (err) {
      setMessages([...newMessages, { id: (Date.now()+1).toString(), role: 'assistant', content: "Sorry, I couldn't reach the server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="fab-copilot" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: isOpen ? 2000 : 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', transition: 'bottom 0.3s ease' }}>
      {isOpen && (
        <div 
          style={{ 
            marginBottom: '16px',
            width: '90vw',
            maxWidth: '380px',
            height: 'min(550px, 75vh)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            background: 'var(--card-bg)', 
            border: '1px solid var(--card-border)', 
            borderRadius: '24px',
            backdropFilter: 'blur(10px)',
            fontFamily: 'var(--font-inter)'
          }}
        >
          {/* Header */}
          <div 
            style={{ 
              padding: '16px 20px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid var(--card-border)', 
              background: 'var(--hover-bg)' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '36px', height: '36px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' 
              }}>
                <Bot size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--fg)' }}>LINQ Copilot</h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event Assistant</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ 
                padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', 
                color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%' }}>
                <Bot size={48} style={{ marginBottom: '16px', color: '#3b82f6', opacity: 0.5 }} />
                <p style={{ margin: '0 0 8px 0', color: 'var(--fg)', fontWeight: 'bold' }}>How can I help you?</p>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ask me about upcoming events or ask me to draft an event description!</p>
              </div>
            ) : (
              messages.map((m: any) => (
                <div 
                  key={m.id} 
                  style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
                >
                  <div 
                    style={{
                      maxWidth: '85%',
                      borderRadius: '16px',
                      borderTopRightRadius: m.role === 'user' ? '4px' : '16px',
                      borderTopLeftRadius: m.role !== 'user' ? '4px' : '16px',
                      padding: '12px 16px',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      ...(m.role === 'user' 
                        ? { background: '#3b82f6', color: '#fff' }
                        : { background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)' }
                      )
                    }}
                  >
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => <Link href={props.href || '#'} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 'bold' }} {...props} />,
                        p: ({ node, ...props }) => <p style={{ margin: '0 0 8px 0' }} {...props} />,
                        ul: ({ node, ...props }) => <ul style={{ paddingLeft: '20px', margin: '0 0 8px 0' }} {...props} />,
                        li: ({ node, ...props }) => <li style={{ marginBottom: '4px' }} {...props} />
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>

                    {/* GENERATIVE UI COMPONENTS */}
                    {m.results && m.results.type === 'EVENTS' && m.results.events?.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         {m.results.events.map((ev: any) => (
                            <div key={ev.id} style={{ padding: '12px', background: 'var(--card-bg)', border: '1px solid rgba(192, 132, 252, 0.4)', borderRadius: '12px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                 <Calendar size={14} color="var(--primary)" />
                                 <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--fg)' }}>{ev.title}</h4>
                               </div>
                               <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                 {new Date(ev.date).toLocaleDateString()} @ {ev.venue}
                               </p>
                               <Link href={`/events/${ev.id}`} style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                                 View Event →
                               </Link>
                            </div>
                         ))}
                      </div>
                    )}

                    {m.results && m.results.type === 'ANALYTICS' && m.results.analytics && (
                      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                         <div style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(192, 132, 252, 0.4)' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--fg)' }}>{m.results.analytics.totalAttendees}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Attendees</div>
                         </div>
                         <div style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(192, 132, 252, 0.4)' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fbbf24' }}>★ {m.results.analytics.averageRating?.toFixed(1)}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg Rating</div>
                         </div>
                      </div>
                    )}

                    {m.results && m.results.type === 'FEEDBACK' && m.results.feedback?.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         {m.results.feedback.map((fb: any, idx: number) => (
                            <div key={idx} style={{ padding: '12px', background: 'var(--card-bg)', border: '1px solid rgba(192, 132, 252, 0.4)', borderRadius: '12px' }}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                 <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--fg)' }}>{fb.userName}</span>
                                 <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>{'★'.repeat(Math.max(1, Math.min(5, fb.rating || 5)))}</span>
                               </div>
                               <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>"{fb.comment}"</p>
                            </div>
                         ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div 
                  style={{ 
                    borderRadius: '16px', borderTopLeftRadius: '4px', padding: '12px 16px', 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--input-bg)', border: '1px solid var(--card-border)' 
                  }}
                >
                  <Loader2 size={16} color="#3b82f6" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form 
            onSubmit={onSubmit}
            style={{ padding: '16px', display: 'flex', gap: '8px', borderTop: '1px solid var(--card-border)' }}
          >
            <input
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              placeholder="Ask me anything..."
              style={{ 
                flex: 1, padding: '12px 16px', fontSize: '0.9rem', borderRadius: '12px', outline: 'none',
                background: 'var(--input-bg)', 
                border: '1px solid var(--card-border)',
                color: 'var(--fg)'
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !localInput.trim()}
              style={{ 
                padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--primary)', color: '#fff', border: 'none',
                opacity: (isLoading || !localInput.trim()) ? 0.5 : 1,
                cursor: (isLoading || !localInput.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
            width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer',
            background: 'linear-gradient(135deg, var(--primary), #a855f7)', 
            color: '#fff', transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen ? <X size={28} /> : <Sparkles size={28} />}
      </button>
    </div>
  );
}
