import * as SecureStore from 'expo-secure-store';
import { SESSION_KEY } from '@/config';
import type { Session } from '@/api/auth';

type Listener = (session: Session | null) => void;

let cached: Session | null = null;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((l) => l(cached));
}

/**
 * Sessions saved by older builds carried role as a string ('Receiver'); the
 * switch model needs RoleConfig | null. Anything else is dropped (re-login).
 */
function isCurrentShape(session: Session): boolean {
  const role = session.role as unknown;
  return role === null || (typeof role === 'object' && Array.isArray((role as Session['role'])?.visibleFields));
}

function isExpired(session: Session): boolean {
  const t = Date.parse(session.expiresAt);
  return Number.isFinite(t) && t <= Date.now();
}

export const tokenStore = {
  /** Reads the persisted session into memory. Call once on app start. */
  async load(): Promise<Session | null> {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_KEY);
      const parsed = raw ? (JSON.parse(raw) as Session) : null;
      if (parsed && isCurrentShape(parsed) && !isExpired(parsed)) {
        // Saved before work sessions existed: unknown until /me fills it in (no-flow screen re-checks).
        if (parsed.session === undefined) parsed.session = null;
        cached = parsed;
      } else {
        cached = null;
        if (raw) await SecureStore.deleteItemAsync(SESSION_KEY);
      }
    } catch {
      cached = null;
    }
    return cached;
  },

  /** Synchronous, in-memory read used by the http client. */
  get(): Session | null {
    return cached;
  },

  getToken(): string | null {
    return cached?.token ?? null;
  },

  async set(session: Session): Promise<void> {
    cached = session;
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    emit();
  },

  async clear(): Promise<void> {
    cached = null;
    emit();
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    } catch {
      // memory cache is already cleared
    }
  },

  /** Notified on every set/clear, including a 401 clear from the http client. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
