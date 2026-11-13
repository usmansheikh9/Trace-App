import { request } from './http';
import type { BoxField } from './boxes';

/**
 * The dynamic role (backend RoleConfigDto). The UI is driven by these switches,
 * never by the role's name. Managed by admins; null until one is assigned.
 */
export type RoleConfig = {
  id: number;
  name: string;
  /** Stage the server stamps on a saved scan. Display only; never sent. */
  saveStage: string | null;
  canScan: boolean;
  canFindCopy: boolean;
  canSave: boolean;
  canPrint: boolean;
  /** Box field keys to show on the Result screen, in display order. */
  visibleFields: BoxField[];
};

/** The work session a user belongs to (backend SessionRefDto). Owns the workflow and the boxes. */
export type SessionRef = { id: number; name: string };

/** The signed-in user's login session (token + profile). Unrelated to the work session. */
export type Session = {
  token: string;
  /** ISO-8601 timestamp. */
  expiresAt: string;
  userId: string;
  role: RoleConfig | null;
  /** The user's work session; null until management assigns one (or while it's inactive). */
  session: SessionRef | null;
  // Profile fields shown on the Profile screen. Never carries passwords.
  name: string;
  /** 00000-0000000-0 */
  cnic: string;
  email: string;
  /** ISO date, YYYY-MM-DD. */
  dateOfBirth: string;
};

export type LoginRequest = {
  cnic: string;
  password: string;
};
export type LoginResponse = Session;

export type RegisterRequest = {
  name: string;
  cnic: string;
  email: string;
  /** ISO date, YYYY-MM-DD. */
  dateOfBirth: string;
  password: string;
  /** Optional. Only an admin registering someone in person supplies it. */
  masterPassword?: string;
};
export type RegisterResponse =
  | { status: 'Approved'; session: Session }
  | { status: 'Pending' };

/** Coded 403s from /auth/login (problem Title). */
export const AUTH_CODES = {
  pending: 'account_pending',
  rejected: 'account_rejected',
} as const;

/**
 * A user can operate only with both a role and a work session. Either missing means
 * "No flow assigned". (Older stored sessions lack the field; undefined counts as missing.)
 */
export function hasFlow(s: Pick<Session, 'role' | 'session'> | null | undefined): boolean {
  return !!s?.role && !!s?.session;
}

export const authApi = {
  login(cnic: string, password: string): Promise<LoginResponse> {
    const body: LoginRequest = { cnic, password };
    return request<LoginResponse>('POST', '/auth/login', { body, auth: false, tag: 'auth.login' });
  },

  register(input: RegisterRequest): Promise<RegisterResponse> {
    return request<RegisterResponse>('POST', '/auth/register', {
      body: input,
      auth: false,
      tag: 'auth.register',
    });
  },
};
