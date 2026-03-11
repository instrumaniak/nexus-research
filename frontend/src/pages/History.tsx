import { useNavigate } from 'react-router-dom';
import { Globe, ChevronRight } from 'lucide-react';
import { useChatStore } from '@/stores/chat.store';

export function HistoryPage() {
  const navigate = useNavigate();
  const { sessions } = useChatStore();

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-[720px] mx-auto">
        <h1 className="text-xl font-semibold text-foreground">History</h1>
        <p className="text-sm text-muted-foreground mb-5">Your past research sessions</p>

        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(`/chat/${session.id}`);
              }}
              onClick={() => navigate(`/chat/${session.id}`)}
              className="bg-card border border-border rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:bg-muted hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="w-[34px] h-[34px] rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="text-primary" size={16} />
              </div>

              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium text-[13.5px] truncate text-foreground">
                  {session.title}
                </span>
                <span className="text-[12px] text-muted-foreground mt-0.5">
                  Web Search · {session.updatedAt}
                </span>
              </div>

              <div className="shrink-0 text-muted-foreground/50">
                <ChevronRight size={16} />
              </div>
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-lg">
              No sessions found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
