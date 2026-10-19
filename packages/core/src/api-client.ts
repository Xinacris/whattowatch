import type { DeckPage } from "./deck";
import { filtersToQuery, type RoomFilters } from "./filters";
import type { Vote } from "./match";
import type { Lang } from "./region";
import type { RoomView, Viewer } from "./room";
import type { DeckCard, Provider, TitleDetail, TitleKey } from "./tmdb/models";

// The app API as seen from a client. Web passes "" (same origin), mobile passes EXPO_PUBLIC_API_URL.

export type RoomError = "not_found" | "expired" | "full" | "bad_code" | "live_unavailable" | "network";

export class ApiError extends Error {
  constructor(readonly code: RoomError | string) { super(code); this.name = "ApiError"; }
  get transient(): boolean { return this.code === "network" || this.code === "unknown"; }
}

export function createWtwApi(base: string, doFetch: typeof fetch = (...a) => fetch(...a)) {
  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await doFetch(base + path, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" });
    } catch {
      throw new ApiError("network");
    }
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new ApiError(data.error ?? (res.status >= 500 ? "network" : "unknown"));
    return data;
  }
  const post = <T>(path: string, payload: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(payload) });

  return {
    status: () => call<{ live: boolean; store: string | null }>("/match/api/status"),
    trending: (lang: Lang) => call<import("./tmdb/models").TitleSummary[]>(`/match/api/tmdb/trending?lang=${lang}`),
    providers: (region: string, lang: Lang) => call<{ region: string; providers: Provider[] }>(`/match/api/tmdb/providers?region=${region}&lang=${lang}`),
    title: (key: TitleKey, lang: Lang, region: string) => call<TitleDetail>(`/match/api/tmdb/title/${key[0] === "m" ? "movie" : "tv"}/${key.slice(1)}?lang=${lang}&region=${region}`),
    deck(filters: RoomFilters, seed: string, page: number, lang: Lang) {
      const q = new URLSearchParams({ ...filtersToQuery(filters), seed, page: String(page), lang });
      return call<DeckPage>(`/match/api/tmdb/deck?${q.toString()}`);
    },
    cards(keys: TitleKey[], filters: RoomFilters, lang: Lang) {
      const q = new URLSearchParams({ keys: keys.join("."), region: filters.region, lang });
      if (filters.providers.length) q.set("providers", filters.providers.join("."));
      return call<DeckCard[]>(`/match/api/tmdb/cards?${q.toString()}`);
    },
    createRoom: (viewer: Viewer, filters: RoomFilters) => post<RoomView>("/match/api/rooms", { viewer, filters }),
    sync: (code: string, viewer: Viewer) => post<RoomView>(`/match/api/rooms/${code}/sync`, { viewer }),
    vote: (code: string, viewer: Viewer, key: TitleKey, vote: Vote | null) => post<RoomView>(`/match/api/rooms/${code}/vote`, { viewer, key, vote }),
    leave: (code: string, viewer: Viewer) => post<{ ok: true }>(`/match/api/rooms/${code}/leave`, { viewer }),
  };
}

export type WtwApi = ReturnType<typeof createWtwApi>;
