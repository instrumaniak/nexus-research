import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getSession, getSessions, streamChat } from '@/api/chat.api';
import { AppLayout } from '@/components/layout/AppLayout';
import { formatRelativeTime } from '@/lib/time';
import { useChatStore } from '@/stores/chat.store';
import type { ChatMode, Message, SessionSummary } from '@/types';

const MODE_OPTIONS: Array<{
  mode: ChatMode;
  label: string;
  icon: string;
  disabled?: boolean;
}> = [
  { mode: 'WEB_SEARCH', label: 'Web Search', icon: '🌐' },
  { mode: 'KB_SEARCH', label: 'KB Search', icon: '📚', disabled: true },
  { mode: 'DEEP_RESEARCH', label: 'Deep Research', icon: '🔬', disabled: true },
];

export default function Chat() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const numericSessionId = sessionId ? Number(sessionId) : null;
  const {
    sessions,
    messages,
    streamingContent,
    isStreaming,
    mode,
    progressStep,
    progressHistory,
    sources,
    activeSessionId,
    setMode,
    startStream,
    appendToken,
    finaliseStream,
    setProgressStep,
    setSessions,
    setActiveSession,
    setActiveSessionId,
    resetConversation,
  } = useChatStore();
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [kbMessage, setKbMessage] = useState<string | null>(null);

  const isUrlInput = useMemo(() => /^https?:\/\//.test(query.trim()), [query]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const data = await getSessions();
        if (active) {
          setSessions(data);
        }
      } catch {
        if (active) {
          setError('Failed to load sessions');
        }
      } finally {
        if (active) {
          setIsLoadingSessions(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [setSessions]);

  useEffect(() => {
    if (!numericSessionId) {
      setActiveSessionId(null);
      return;
    }

    let active = true;
    setIsLoadingSession(true);

    void (async () => {
      try {
        const data = await getSession(numericSessionId);
        if (active) {
          setActiveSession(data.session.id, data.messages);
        }
      } catch {
        if (active) {
          setError('Failed to load that session');
          navigate('/chat');
        }
      } finally {
        if (active) {
          setIsLoadingSession(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [navigate, numericSessionId, setActiveSession, setActiveSessionId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery || isStreaming) {
      return;
    }

    setError(null);
    setKbMessage(null);
    startStream(trimmedQuery);
    setQuery('');

    try {
      await streamChat(
        {
          query: trimmedQuery,
          mode,
          sessionId: activeSessionId,
        },
        {
          onStep: (message) => setProgressStep(message),
          onToken: (token) => appendToken(token),
          onDone: (resultSources) => finaliseStream(resultSources),
          onError: (message) => {
            setError(message);
            finaliseStream([]);
          },
        },
      );

      const refreshedSessions = await getSessions();
      setSessions(refreshedSessions);

      if (!activeSessionId && refreshedSessions[0]) {
        setActiveSessionId(refreshedSessions[0].id);
        navigate(`/chat/${refreshedSessions[0].id}`, { replace: true });
      }
    } catch (streamError) {
      if (streamError instanceof Error) {
        setError(streamError.message);
      } else {
        setError('Failed to stream response');
      }
    }
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event as unknown as FormEvent<HTMLFormElement>);
    }
  };

  const handleNewChat = () => {
    resetConversation();
    navigate('/chat');
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-73px)] flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-800 bg-slate-900/60 p-5 lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Sessions</p>
              <h2 className="mt-2 font-serif text-2xl text-slate-50">Recent research</h2>
            </div>
            <button
              type="button"
              onClick={handleNewChat}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-400"
            >
              New chat
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {isLoadingSessions ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60"
                  />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-700 px-4 py-5 text-sm text-slate-400">
                No saved sessions yet.
              </p>
            ) : (
              sessions.map((session) => (
                <SessionButton
                  key={session.id}
                  session={session}
                  isActive={session.id === numericSessionId}
                  onClick={() => navigate(`/chat/${session.id}`)}
                />
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-slate-800 bg-slate-950/70 px-5 py-4 md:px-8">
            <div className="flex flex-wrap gap-3">
              {MODE_OPTIONS.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  disabled={option.disabled}
                  title={option.disabled ? 'Coming soon' : undefined}
                  onClick={() => setMode(option.mode)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    mode === option.mode
                      ? 'bg-cyan-400 text-slate-950'
                      : option.disabled
                        ? 'cursor-not-allowed border border-slate-800 text-slate-500'
                        : 'border border-slate-700 text-slate-200 hover:border-cyan-400'
                  }`}
                >
                  <span className="mr-2" aria-hidden="true">
                    {option.icon}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
            {error ? (
              <p className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}
            {kbMessage ? (
              <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {kbMessage}
              </p>
            ) : null}

            {isLoadingSession ? (
              <div className="space-y-4">
                <div className="h-24 animate-pulse rounded-[1.5rem] border border-slate-800 bg-slate-900/60" />
                <div className="h-40 animate-pulse rounded-[1.5rem] border border-slate-800 bg-slate-900/60" />
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <div className="rounded-[2rem] border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Web Search</p>
                <h1 className="mt-4 font-serif text-4xl text-slate-50">Ask a research question</h1>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Submit a question or paste a URL. Nexus will search, read, summarise, and stream
                  back an answer with cited sources.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onSaveToKb={() => setKbMessage('Coming in Phase 2')}
                  />
                ))}

                {progressHistory.length > 0 ? (
                  <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/50 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Progress</p>
                    <ol className="mt-3 space-y-2 text-sm text-slate-300">
                      {progressHistory.map((step, index) => (
                        <li key={`${step}-${index}`}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {isStreaming ? (
                  <div className="rounded-[1.75rem] border border-cyan-400/20 bg-slate-900/80 p-5">
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Assistant</p>
                    {progressStep ? (
                      <p className="mt-2 text-sm text-cyan-100">{progressStep}</p>
                    ) : null}
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                      {streamingContent || 'Preparing response...'}
                    </p>
                  </div>
                ) : null}

                {sources.length > 0 ? (
                  <div className="rounded-[1.5rem] border border-slate-800 bg-slate-900/50 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Sources</p>
                    <ul className="mt-3 space-y-2 text-sm">
                      {sources.map((source) => (
                        <li key={source.url}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-200 underline decoration-cyan-500/40 underline-offset-4"
                          >
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 bg-slate-950/80 px-5 py-4 md:px-8">
            <form onSubmit={handleSubmit}>
              <div className="rounded-[1.75rem] border border-slate-800 bg-slate-900 p-3 shadow-xl shadow-slate-950/20">
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  rows={4}
                  placeholder="Ask a question or paste a URL..."
                  className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-7 text-slate-100 outline-none placeholder:text-slate-500"
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-3 pt-3">
                  <div className="flex items-center gap-3">
                    {isUrlInput ? (
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                        Summarise URL
                      </span>
                    ) : null}
                    <Link to="/history" className="text-sm text-slate-400 hover:text-slate-200">
                      Open full history
                    </Link>
                  </div>
                  <button
                    type="submit"
                    disabled={!query.trim() || isStreaming}
                    className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isStreaming ? 'Streaming...' : 'Send'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function SessionButton({
  session,
  isActive,
  onClick,
}: {
  session: SessionSummary;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        isActive
          ? 'border-cyan-400/40 bg-cyan-400/10'
          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
      }`}
    >
      <p className="line-clamp-2 text-sm font-medium text-slate-100">{session.title}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.25em] text-slate-500">{session.mode}</p>
      <p className="mt-2 text-xs text-slate-400">{formatRelativeTime(session.updatedAt)}</p>
    </button>
  );
}

function MessageCard({ message, onSaveToKb }: { message: Message; onSaveToKb: () => void }) {
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`rounded-[1.75rem] border p-5 ${
        isAssistant ? 'border-cyan-400/20 bg-slate-900/80' : 'border-slate-800 bg-slate-950/70'
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {isAssistant ? 'Assistant' : 'You'}
        </p>
        <p className="text-xs text-slate-500">{formatRelativeTime(message.createdAt)}</p>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-100">{message.content}</p>
      {isAssistant ? (
        <button
          type="button"
          onClick={onSaveToKb}
          className="mt-4 rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300 transition hover:border-amber-300 hover:text-amber-100"
        >
          Save to KB
        </button>
      ) : null}
    </div>
  );
}
