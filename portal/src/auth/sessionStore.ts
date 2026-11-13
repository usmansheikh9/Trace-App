import type { Session } from '../api/types';

const KEY = 'trace.portal.session';
type Listener = (s: Session | null) => void;

const listeners = new Set<Listener>();

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (!s.token || Date.parse(s.expiresAt) <= Date.now()) {
      localStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

let cached: Session | null = read();

/** The signed-in admin's session (JWT + profile). Shared by the axios interceptor and AuthContext. */
export const sessionStore = {
  get: () => cached,

  set(s: Session) {
    cached = s;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // memory copy still works for this tab
    }
    listeners.forEach((l) => l(cached));
  },

  clear() {
    if (!cached) return;
    cached = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // already gone
    }
    listeners.forEach((l) => l(null));
  },

  subscribe(l: Listener) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};
