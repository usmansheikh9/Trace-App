import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ApiError, AUTH_CODES, meApi } from '@/api';
import type { Me, Session } from '@/api';
import { useAuth } from './AuthContext';
import { tokenStore } from './tokenStore';

/**
 * Loads GET /me whenever the screen gains focus and folds the result back into
 * the stored session. Role switches are managed server-side, so this is how a
 * newly assigned (or changed, or removed) role or work session reaches the scanner without a
 * re-login. An account rejected after sign-in is signed out.
 */
export function useMe(): Me | null {
  const { signIn, signOut } = useAuth();
  const [me, setMe] = useState<Me | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      meApi
        .get()
        .then((next) => {
          if (!active) return;
          setMe(next);
          const current = tokenStore.get();
          if (current && changed(current, next)) {
            void signIn({
              ...current,
              role: next.role,
              session: next.session,
              name: next.user.name,
              cnic: next.user.cnic,
              email: next.user.email,
              dateOfBirth: next.user.dateOfBirth,
            });
          }
        })
        .catch((e) => {
          // 401 is already handled by the http client (session cleared).
          if (e instanceof ApiError && (e.code === AUTH_CODES.rejected || e.code === AUTH_CODES.pending)) {
            void signOut();
          }
        });
      return () => {
        active = false;
      };
    }, [signIn, signOut]),
  );

  return me;
}

function changed(s: Session, me: Me): boolean {
  return (
    JSON.stringify(s.role) !== JSON.stringify(me.role) ||
    JSON.stringify(s.session ?? null) !== JSON.stringify(me.session) ||
    s.name !== me.user.name ||
    s.cnic !== me.user.cnic ||
    s.email !== me.user.email ||
    s.dateOfBirth !== me.user.dateOfBirth
  );
}
