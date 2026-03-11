import { createParser, type ParsedEvent, type ParseEvent } from 'eventsource-parser';
import { API_BASE_URL, apiClient } from './client';
import { useAuthStore } from '@/stores/auth.store';
import type { ChatMode, SessionDetail, SessionSummary, Source } from '@/types';

interface StreamPayload {
  query: string;
  mode: ChatMode;
  sessionId?: number | null;
}

interface StreamHandlers {
  onStep?: (message: string) => void;
  onToken?: (token: string) => void;
  onDone?: (sources: Source[]) => void;
  onError?: (message: string) => void;
}

type StreamEvent =
  | { step: 'searching' | 'reading' | 'summarising'; message: string }
  | { step: 'token'; token: string }
  | { step: 'done'; sources: Source[] }
  | { step: 'error'; message: string };

export async function streamChat(payload: StreamPayload, handlers: StreamHandlers): Promise<void> {
  const token = await useAuthStore.getState().getFreshToken();

  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query: payload.query,
      mode: payload.mode,
      ...(payload.sessionId ? { sessionId: payload.sessionId } : {}),
    }),
  });

  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new Error(body || 'Failed to start stream');
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  const parser = createParser((event: ParseEvent) => {
    if (event.type !== 'event') {
      return;
    }

    const parsed = JSON.parse((event as ParsedEvent).data) as StreamEvent;

    if (parsed.step === 'token') {
      handlers.onToken?.(parsed.token);
      return;
    }

    if (parsed.step === 'done') {
      handlers.onDone?.(parsed.sources);
      return;
    }

    if (parsed.step === 'error') {
      handlers.onError?.(parsed.message);
      return;
    }

    handlers.onStep?.(parsed.message);
  });

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    parser.feed(decoder.decode(value, { stream: true }));
  }
}

export async function getSessions(): Promise<SessionSummary[]> {
  const response = await apiClient.get<SessionSummary[]>('/chat/sessions');
  return response.data;
}

export async function getSession(sessionId: number): Promise<SessionDetail> {
  const response = await apiClient.get<SessionDetail>(`/chat/sessions/${sessionId}`);
  return response.data;
}
