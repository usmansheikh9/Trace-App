import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/admin';
import { api, ApiError, toApiError } from '../api/client';
import type { Session } from '../api/types';
import { sessionStore } from './sessionStore';

type AuthValue = {
  session: Session | null;
  signIn: (cnic: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export const ADMIN_REQUIRED = 'Admin access required';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(sessionStore.get());

  // Follows the interceptor too: a 401/403 anywhere clears the store and lands here.
  useEffect(() => sessionStore.subscribe(setSession), []);

  const signIn = useCallback(async (cnic: string, password: string) => {
    const s = await authApi.login(cnic, password);

    // The session carries no admin flag; the server decides per request. Probe an
    // admin endpoint with the new token before storing anything.
    try {
      await api.get('/admin/roles', { headers: { Authorization: `Bearer ${s.token}` } });
    } catch (e) {
      const err = toApiError(e);
      if (err.status === 403) throw new ApiError(403, ADMIN_REQUIRED);
      throw err;
    }
    sessionStore.set(s);
  }, []);

  const signOut = useCallback(() => sessionStore.clear(), []);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
