import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Globe, Database, FlaskConical, Send, ExternalLink, Loader2, Bookmark } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useChatStore } from '@/stores/chat.store';
import { useKbStore } from '@/stores/kb.store';
import { Textarea } from '@/components/ui/textarea';

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    sessions,
    messages,
    mode,
    setMode,
    isStreaming,
    streamingContent,
    progressStep,
    error,
    loadSession,
    clearSession,
    submitQuery,
    pendingInput,
    clearPendingInput,
  } = useChatStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSession = sessions.find((s) => s.id === Number(id));

  // Load session from store when URL param changes
  useEffect(() => {
    if (id) {
      void loadSession(Number(id));
    } else {
      clearSession();
    }
  }, [id, loadSession, clearSession]);

  // Pick up pending input set by suggestion card clicks
  useEffect(() => {
    if (pendingInput) {
      setInput(pendingInput);
      clearPendingInput();
      textareaRef.current?.focus();
    }
  }, [pendingInput, clearPendingInput]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent, isStreaming]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`; // capped at 6 lines
  };

  const handleSend = async () => {
    const query = input.trim();
    if (!query || isStreaming) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const sessionId = id ? Number(id) : null;
    await submitQuery(query, mode, sessionId);

    if (!id) {
      const { sessions } = useChatStore.getState();
      if (sessions[0]) {
        navigate(`/chat/${sessions[0].id}`, { replace: true });
      }
    }
  };

  const isEmptyState = !id && messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Top Bar */}
      <div className="h-[52px] border-b border-border flex items-center justify-between px-5 shrink-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          {currentSession && (
            <h2 className="text-sm font-medium text-foreground truncate max-w-[300px] md:max-w-[500px]">
              {currentSession.title}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('web')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all',
              mode === 'web'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground',
            )}
          >
            <Globe size={11} /> Web Search
          </button>
          <button
            onClick={() => setMode('kb')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all',
              mode === 'kb'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground',
            )}
          >
            <Database size={11} /> KB Search
          </button>
          <button
            disabled
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-border text-muted-foreground opacity-40 cursor-not-allowed',
            )}
          >
            <FlaskConical size={11} /> Deep Research{' '}
            <span className="text-[9px] opacity-60">· P2</span>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-7">
        <div className="max-w-[700px] mx-auto px-6 flex flex-col gap-6">
          {isEmptyState && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-center">
              <p className="text-4xl font-semibold text-muted-foreground/30 select-none">Nexus</p>
              <p className="text-sm text-muted-foreground">
                Ask a research question to get started.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn('flex gap-4', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                  <span className="text-xs font-bold text-primary">N</span>
                </div>
              )}
              <div
                className={cn(
                  'flex flex-col gap-2 max-w-[85%] group',
                  m.role === 'user' ? 'items-end' : 'items-start',
                )}
              >
                <div
                  className={cn(
                    'px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed whitespace-pre-wrap relative',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card border border-border text-foreground shadow-sm',
                  )}
                >
                  {m.content}
                  {m.role === 'assistant' && m.content && (
                    <button
                      onClick={async () => {
                        const title = m.content.slice(0, 60) + (m.content.length > 60 ? '...' : '');
                        const { saveItem } = useKbStore.getState();
                        try {
                          await saveItem({ title, content: m.content });
                          // Show feedback briefly
                          const btn = document.getElementById(`save-btn-${m.id}`);
                          if (btn) {
                            btn.innerHTML =
                              '<svg size="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
                            setTimeout(() => {
                              btn.innerHTML =
                                '<svg size="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
                            }, 1500);
                          }
                        } catch {
                          // Error handled in store
                        }
                      }}
                      id={`save-btn-${m.id}`}
                      title="Save to Knowledge Base"
                      className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all text-muted-foreground hover:text-primary"
                    >
                      <Bookmark size={12} />
                    </button>
                  )}
                </div>
                {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="w-full text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                      Sources
                    </span>
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

          {isStreaming && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                <span className="text-xs font-bold text-primary">N</span>
              </div>
              <div className="flex flex-col gap-2 max-w-[85%]">
                {progressStep && !streamingContent && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-1">
                    <Loader2 size={11} className="animate-spin shrink-0" />
                    <span>{progressStep}</span>
                  </div>
                )}

                {streamingContent && (
                  <div className="bg-card border border-border px-4 py-3 rounded-2xl text-[14.5px] leading-relaxed text-foreground shadow-sm whitespace-pre-wrap">
                    {streamingContent}
                    <span className="inline-block w-[2px] h-[1em] bg-primary/60 ml-0.5 animate-pulse align-middle" />
                  </div>
                )}

                {!streamingContent && !progressStep && (
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
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 p-4 md:px-8 md:pb-8 bg-gradient-to-t from-background via-background to-transparent pt-6">
        <div className="max-w-[700px] mx-auto flex flex-col gap-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Type your research question…"
              className="pr-12 min-h-[56px] py-4 bg-card shadow-lg border-border focus-visible:border-primary/40 transition-all resize-none overflow-hidden"
              rows={1}
              disabled={isStreaming}
            />
            <button
              onClick={() => void handleSend()}
              disabled={!input.trim() || isStreaming}
              className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-sm"
            >
              {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <p className="text-[11px] text-center text-muted-foreground/50">
            Nexus may make mistakes. Always verify important information from sources.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
