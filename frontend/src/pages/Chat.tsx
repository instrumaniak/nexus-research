import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Globe, Database, FlaskConical, Send, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useChatStore } from '@/stores/chat.store';
import { Textarea } from '@/components/ui/textarea';

export function ChatPage() {
  const { sessionId } = useParams();
  const { messages, sessions, mode, setMode } = useChatStore();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentSession = sessions.find((s) => s.id === Number(sessionId));

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    // In Phase F1 this is purely UI mock
    setInput('');
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pt-8 pb-32 px-4 md:px-8 space-y-8">
        {messages.length === 0 ? (
          <div className="max-w-[600px] mx-auto mt-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
              What are we researching today?
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              Nexus helps you synthesis information from the web and your knowledge base.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {[
                "Explain Quantum Computing like I'm five",
                'Compare NestJS vs Axum for microservices',
                'Summarise the latest research on solid-state batteries',
                'Find open-source alternatives to Airtable',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="p-4 bg-card border border-border rounded-xl text-sm hover:border-primary/50 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto space-y-8">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'group flex w-full gap-4 animate-in fade-in duration-500',
                  m.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-xs font-bold text-primary">N</span>
                  </div>
                )}
                <div
                  className={cn(
                    'flex flex-col gap-2 max-w-[85%]',
                    m.role === 'user' ? 'items-end' : 'items-start',
                  )}
                >
                  <div
                    className={cn(
                      'px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-card border border-border text-foreground shadow-sm',
                    )}
                  >
                    {m.content.split('\n').map((line, i) => (
                      <p key={i} className={cn(line ? 'mb-4 last:mb-0' : 'h-4')}>
                        {line}
                      </p>
                    ))}
                  </div>
                  {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {m.sources.map((s, i) => (
                        <a
                          key={i}
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 border border-border rounded-md text-[11px] text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                        >
                          <ExternalLink size={10} />
                          {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">N</span>
                </div>
                <div className="bg-card border border-border px-4 py-3 rounded-2xl">
                  <div className="flex gap-1">
                    <span
                      className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-background via-background to-transparent pt-12">
        <div className="max-w-[800px] mx-auto flex flex-col gap-3">
          {/* Mode pills */}
          <div className="flex items-center gap-2 px-1">
            <button
              onClick={() => setMode('general')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all',
                mode === 'general'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              <FlaskConical size={14} /> General
            </button>
            <button
              onClick={() => setMode('web')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all',
                mode === 'web'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              <Globe size={14} /> Web Search
            </button>
            <button
              onClick={() => setMode('kb')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all',
                mode === 'kb'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              <Database size={14} /> Knowledge Base
            </button>
          </div>

          <div className="relative group">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your research question..."
              className="pr-12 min-h-[56px] py-4 bg-card shadow-lg border-border focus-visible:border-primary/40 transition-all resize-none overflow-hidden"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Send size={16} />
            </button>
          </div>
          {currentSession && (
            <p className="text-[11px] text-center text-muted-foreground">
              Current Research:{' '}
              <span className="text-foreground/70 font-medium">{currentSession.title}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
