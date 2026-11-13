import { API_URL } from '@/config';
import { tokenStore } from '@/auth/tokenStore';

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'validation'
  | 'badRequest'
  | 'rateLimited'
  | 'unavailable'
  | 'server'
  | 'client';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  /** Keys have their first letter lower-cased: "Cnic" -> "cnic". */
  readonly fieldErrors: Record<string, string>;
  /** Machine code for coded failures (problem Title). */
  readonly code?: string;
  readonly tag?: string;

  constructor(init: {
    kind: ApiErrorKind;
    status?: number;
    message: string;
    fieldErrors?: Record<string, string>;
    code?: string;
    tag?: string;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status ?? 0;
    this.fieldErrors = init.fieldErrors ?? {};
    this.code = init.code;
    this.tag = init.tag;
  }
}

export type RequestOptions = {
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
  tag?: string;
};

type Problem = {
  title?: string;
  detail?: string;
  errors?: Record<string, string[] | undefined>;
};

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400) return 'badRequest';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rateLimited';
  if (status === 502 || status === 503 || status === 504) return 'unavailable';
  if (status >= 500) return 'server';
  return 'client';
}

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(status: number, body: unknown, tag?: string): ApiError {
  let kind = kindForStatus(status);

  // Domain errors (403 / 409 / 429): plain-string body.
  if (typeof body === 'string') {
    return new ApiError({ kind, status, message: body, tag });
  }

  if (body && typeof body === 'object') {
    const problem = body as Problem;
    const errors = problem.errors;

    if (errors && typeof errors === 'object') {
      // Coded failure: Title is a machine code, message under errors.code.
      const codeMessage = errors.code?.[0];
      if (codeMessage !== undefined && problem.title) {
        return new ApiError({ kind, status, code: problem.title, message: codeMessage, tag });
      }

      // RFC7807 ValidationProblem: errors.<camelField>[0].
      const fieldErrors: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(errors)) {
        if (msgs?.[0]) fieldErrors[lowerFirst(key)] = msgs[0];
      }
      if (Object.keys(fieldErrors).length > 0) {
        if (status === 400) kind = 'validation';
        return new ApiError({
          kind,
          status,
          message: Object.values(fieldErrors)[0],
          fieldErrors,
          tag,
        });
      }
    }

    const message = problem.detail ?? problem.title;
    if (message) return new ApiError({ kind, status, message, tag });
  }

  return new ApiError({ kind, status, message: `Request failed (${status})`, tag });
}

export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, timeoutMs = 20000, tag } = opts;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenStore.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiError({ kind: 'timeout', message: 'Request timed out', tag });
    }
    throw new ApiError({ kind: 'network', message: 'Network request failed', tag });
  } finally {
    clearTimeout(timer);
  }

  const parsed = await readBody(res);

  if (!res.ok) {
    // A 401 on an authed call ends the session; AuthContext reacts via tokenStore.subscribe.
    if (res.status === 401 && auth) await tokenStore.clear();
    throw toApiError(res.status, parsed, tag);
  }

  return parsed as T;
}
