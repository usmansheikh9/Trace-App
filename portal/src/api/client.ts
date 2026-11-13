import axios, { AxiosError } from 'axios';
import { sessionStore } from '../auth/sessionStore';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = sessionStore.get()?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * 401 (expired/invalid token) or 403 (not, or no longer, an admin) on an authed
 * call ends the portal session. The login flow handles its own 401/403.
 */
api.interceptors.response.use(undefined, (error: AxiosError) => {
  const status = error.response?.status;
  const authed = !!error.config?.headers?.Authorization;
  if (authed && (status === 401 || status === 403)) sessionStore.clear();
  return Promise.reject(error);
});

/**
 * Normalized backend error. Same parsing as the mobile client:
 * - plain-string body: domain error (401/403/404/409)
 * - problem with errors.code[0] + title: coded failure (title is the code)
 * - ValidationProblem: errors.<camelField>[0]
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;
  readonly code?: string;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
  }
}

type Problem = { title?: string; detail?: string; errors?: Record<string, string[] | undefined> };

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (!axios.isAxiosError(e)) return new ApiError(0, 'Something went wrong');
  if (!e.response) {
    return new ApiError(0, e.code === 'ECONNABORTED' ? 'Request timed out' : `Can't reach the server at ${API_URL}`);
  }

  const { status, data } = e.response;
  if (typeof data === 'string' && data) return new ApiError(status, data);

  if (data && typeof data === 'object') {
    const problem = data as Problem;
    const errors = problem.errors;
    if (errors) {
      const codeMessage = errors.code?.[0];
      if (codeMessage !== undefined && problem.title) return new ApiError(status, codeMessage, {}, problem.title);

      const fieldErrors: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(errors)) if (msgs?.[0]) fieldErrors[lowerFirst(key)] = msgs[0];
      if (Object.keys(fieldErrors).length > 0) {
        return new ApiError(status, Object.values(fieldErrors)[0], fieldErrors);
      }
    }
    const message = problem.detail ?? problem.title;
    if (message) return new ApiError(status, message);
  }

  if (status === 429) return new ApiError(status, 'Too many attempts. Please wait a minute and try again.');
  return new ApiError(status, `Request failed (${status})`);
}

/** Runs a request and rethrows failures as ApiError. */
export async function call<T>(p: Promise<{ data: T }>): Promise<T> {
  try {
    return (await p).data;
  } catch (e) {
    throw toApiError(e);
  }
}
