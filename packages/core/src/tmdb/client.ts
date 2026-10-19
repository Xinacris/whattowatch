// Server-side TMDB client. The credential is passed in; core never reads env.

export class TmdbError extends Error {
  constructor(readonly status: number, readonly path: string) {
    super(`TMDB ${status} on ${path}`);
    this.name = "TmdbError";
  }
  /** Worth retrying: rate limit or TMDB having a bad minute. */
  get transient(): boolean {
    return this.status === 429 || this.status >= 500 || this.status === 0;
  }
}

export type Params = Record<string, string | number | boolean | undefined | null>;

export interface TmdbClientOptions {
  credential: string;
  fetch?: typeof fetch;
  retries?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  /** Extra fetch init, e.g. Next's `{ next: { revalidate } }`. */
  init?: (path: string) => RequestInit | undefined;
}

export interface TmdbClient {
  get<T>(path: string, params?: Params): Promise<T>;
}

const BASE = "https://api.themoviedb.org/3";

/** v4 read tokens are JWTs; anything else is treated as a v3 api_key. */
export function isReadToken(credential: string): boolean {
  return credential.startsWith("eyJ") && credential.split(".").length === 3;
}

export function buildUrl(path: string, params: Params = {}, apiKey?: string): string {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  if (apiKey) url.searchParams.set("api_key", apiKey);
  return url.toString();
}

function retryAfterMs(res: Response): number | null {
  const header = res.headers.get("retry-after");
  if (!header) return null;
  const secs = Number(header);
  return Number.isFinite(secs) ? Math.min(secs * 1000, 10_000) : null;
}

export function createTmdbClient(opts: TmdbClientOptions): TmdbClient {
  const doFetch = opts.fetch ?? fetch;
  const retries = opts.retries ?? 3;
  const base = opts.baseDelayMs ?? 300;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const bearer = isReadToken(opts.credential);

  async function attempt<T>(path: string, params: Params): Promise<{ ok: T } | { err: TmdbError; wait: number | null }> {
    const url = buildUrl(path, params, bearer ? undefined : opts.credential);
    const headers: Record<string, string> = { accept: "application/json" };
    if (bearer) headers.authorization = `Bearer ${opts.credential}`;
    let res: Response;
    try {
      res = await doFetch(url, { ...opts.init?.(path), headers });
    } catch {
      return { err: new TmdbError(0, path), wait: null };
    }
    if (res.ok) return { ok: (await res.json()) as T };
    return { err: new TmdbError(res.status, path), wait: retryAfterMs(res) };
  }

  return {
    async get<T>(path: string, params: Params = {}): Promise<T> {
      for (let n = 0; ; n++) {
        const r = await attempt<T>(path, params);
        if ("ok" in r) return r.ok;
        if (!r.err.transient || n >= retries) throw r.err;
        await sleep(r.wait ?? base * 2 ** n);
      }
    },
  };
}
