export type ApiErrorCode = 'NETWORK' | 'AUTH' | 'RATE_LIMIT' | 'SERVER' | 'TIMEOUT' | 'UNKNOWN';

export interface ApiError {
  code: ApiErrorCode;
  message: string;         // User-facing message
  detail?: string;         // Raw error string for logging
  retryable: boolean;
}

export interface ApiResult<T> {
  data: T | null;
  error: ApiError | null;
}

interface RetryConfig {
  attempts?: number;    // Default: 3
  baseDelayMs?: number; // Default: 500ms
  jitter?: boolean;     // Default: true
}

const DEFAULT_RETRY: Required<RetryConfig> = {
  attempts: 3,
  baseDelayMs: 500,
  jitter: true,
};

function classifyHttpError(status: number, detail: string): ApiError {
  if (status === 401 || status === 403) {
    return { code: 'AUTH', message: 'Access denied. Please log in again.', detail, retryable: false };
  }
  if (status === 429) {
    return { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a moment.', detail, retryable: true };
  }
  if (status >= 500) {
    return { code: 'SERVER', message: 'Server error. Please try again.', detail, retryable: true };
  }
  return { code: 'UNKNOWN', message: 'An unexpected error occurred.', detail, retryable: false };
}

function classifyNetworkError(err: unknown): ApiError {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('timeout') || msg.includes('AbortError')) {
    return { code: 'TIMEOUT', message: 'Request timed out. Check your connection.', detail: msg, retryable: true };
  }
  if (!navigator.onLine || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return { code: 'NETWORK', message: 'No internet connection.', detail: msg, retryable: false };
  }
  return { code: 'UNKNOWN', message: 'An unexpected error occurred.', detail: msg, retryable: false };
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class ApiClient {
  /**
   * Fetch wrapper with exponential backoff retry.
   * Only retries when `error.retryable` is true.
   */
  static async fetch<T>(
    url: string,
    options: RequestInit = {},
    retry: RetryConfig = {}
  ): Promise<ApiResult<T>> {
    const { attempts, baseDelayMs, jitter } = { ...DEFAULT_RETRY, ...retry };

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const res = await fetch(url, options);
        if (!res.ok) {
          const detail = await res.text().catch(() => `HTTP ${res.status}`);
          const error = classifyHttpError(res.status, detail);
          if (!error.retryable || attempt === attempts) return { data: null, error };
        } else {
          const data = (await res.json()) as T;
          return { data, error: null };
        }
      } catch (err) {
        const error = classifyNetworkError(err);
        if (!error.retryable || attempt === attempts) return { data: null, error };
      }

      // Exponential backoff before next attempt
      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const wait = jitter ? backoff * (0.5 + Math.random() * 0.5) : backoff;
      await delay(wait);
    }

    return { data: null, error: { code: 'UNKNOWN', message: 'Request failed after retries.', retryable: false } };
  }

  /**
   * Wrap a Supabase SDK call with consistent error handling.
   * Does NOT retry on auth/RLS errors (code 403 / PGRST116).
   */
  static async supabaseOp<T>(
    fn: () => Promise<{ data: T | null; error: { message: string; code?: string; status?: number } | null }>,
    retry: RetryConfig = { attempts: 2 }
  ): Promise<ApiResult<T>> {
    const { attempts, baseDelayMs, jitter } = { ...DEFAULT_RETRY, ...retry };

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const { data, error } = await fn();
        if (error) {
          const status = (error as any).status ?? 0;
          const detail = error.message;
          // Never retry auth/permission errors
          if (status === 401 || status === 403 || error.code === 'PGRST116') {
            return { data: null, error: { code: 'AUTH', message: 'Access denied.', detail, retryable: false } };
          }
          const mapped = classifyHttpError(status || 500, detail);
          if (!mapped.retryable || attempt === attempts) return { data: null, error: mapped };
        } else {
          return { data, error: null };
        }
      } catch (err) {
        const error = classifyNetworkError(err);
        if (!error.retryable || attempt === attempts) return { data: null, error };
      }

      const backoff = baseDelayMs! * 2 ** (attempt - 1);
      const wait = jitter ? backoff * (0.5 + Math.random() * 0.5) : backoff;
      await delay(wait);
    }

    return { data: null, error: { code: 'UNKNOWN', message: 'Operation failed after retries.', retryable: false } };
  }
}
