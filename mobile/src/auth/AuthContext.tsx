import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@/api/auth';
import { tokenStore } from './tokenStore';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: Session };

type AuthContextValue = {
  state: AuthState;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    tokenStore.load().then((session) => {
      if (!active) return;
      setState(session ? { status: 'signedIn', session } : { status: 'signedOut' });
    });

    // Keeps state in sync when the http client clears the session on a 401.
    const unsubscribe = tokenStore.subscribe((session) => {
      setState(session ? { status: 'signedIn', session } : { status: 'signedOut' });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback((session: Session) => tokenStore.set(session), []);
  const signOut = useCallback(() => tokenStore.clear(), []);

  const value = useMemo(() => ({ state, signIn, signOut }), [state, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
