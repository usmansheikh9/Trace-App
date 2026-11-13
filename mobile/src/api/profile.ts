import { DEV_NO_AUTH } from '@/config';
import { tokenStore } from '@/auth/tokenStore';
import type { RoleConfig, SessionRef } from './auth';
import { request } from './http';

/** Backend MeDto: current profile, role, work session and stats. */
export type Me = {
  user: {
    id: string;
    name: string;
    /** 00000-0000000-0 */
    cnic: string;
    email: string;
    /** ISO date, YYYY-MM-DD. */
    dateOfBirth: string;
  };
  role: RoleConfig | null;
  session: SessionRef | null;
  stats: {
    /** Total scans this user has saved. */
    scannedSoFar: number;
  };
};

export const meApi = {
  get(): Promise<Me> {
    if (DEV_NO_AUTH) {
      const s = tokenStore.get();
      return Promise.resolve({
        user: {
          id: s?.userId ?? 'dev-user',
          name: s?.name ?? '',
          cnic: s?.cnic ?? '',
          email: s?.email ?? '',
          dateOfBirth: s?.dateOfBirth ?? '',
        },
        role: s?.role ?? null,
        session: s?.session ?? null,
        stats: { scannedSoFar: 1284 },
      });
    }
    return request<Me>('GET', '/me', { tag: 'me' });
  },
};
