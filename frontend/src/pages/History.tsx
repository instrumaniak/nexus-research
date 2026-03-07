import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions } from '@/api/chat.api';
import { AppLayout } from '@/components/layout/AppLayout';
import { formatDateTime, formatRelativeTime } from '@/lib/time';
import { useChatStore } from '@/stores/chat.store';
import type { SessionSummary } from '@/types';

export default function History() {
  const navigate = useNavigate();
  const sessions = useChatStore((state) => state.sessions);
  const setSessions = useChatStore((state) => state.setSessions);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setError('Failed to load session history');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [setSessions]);

  return (
    <AppLayout>
      <div className="p-5 md:p-8">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">History</p>
          <h1 className="mt-2 font-serif text-3xl text-slate-50">Saved research sessions</h1>
        </div>

        {error ? (
          <p className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-[1.5rem] border border-slate-800 bg-slate-900/70"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-slate-400">
            No sessions yet. Start a conversation.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {sessions.map((session) => (
              <HistoryCard
                key={session.id}
                session={session}
                onOpen={() => navigate(`/chat/${session.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function HistoryCard({ session, onOpen }: { session: SessionSummary; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-[1.75rem] border border-slate-800 bg-slate-900/70 p-5 text-left transition hover:border-cyan-400/50 hover:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-medium text-slate-100">{session.title}</h2>
          <p className="mt-2 text-sm text-slate-400">
            {formatDateTime(session.createdAt)} • {session.messageCount} messages
          </p>
        </div>
        <div className="text-right">
          <span className="inline-flex rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-200">
            {session.mode.replace('_', ' ')}
          </span>
          <p className="mt-2 text-sm text-slate-500">{formatRelativeTime(session.updatedAt)}</p>
        </div>
      </div>
    </button>
  );
}
