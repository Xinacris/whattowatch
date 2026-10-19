"use client";
import { filtersToQuery, type DeckPage, type Lang, type RoomFilters, type RoomView, type TitleKey, type Viewer, type Vote } from "@wtw/core";

export type RoomError = "not_found" | "expired" | "full" | "bad_code" | "live_unavailable" | "network";

export class ApiError extends Error {
  constructor(readonly code: RoomError | string) { super(code); }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" });
  } catch {
    throw new ApiError("network");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? (res.status >= 500 ? "network" : "unknown"));
  return data;
}

const post = <T>(path: string, payload: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(payload) });

export const api = {
  status: () => call<{ live: boolean }>("/match/api/status"),
  providers: (region: string, lang: Lang) => call<{ region: string; providers: { id: number; name: string; logo: string | null }[] }>(`/match/api/tmdb/providers?region=${region}&lang=${lang}`),
  deck(filters: RoomFilters, seed: string, page: number, lang: Lang) {
    const q = new URLSearchParams({ ...filtersToQuery(filters), seed, page: String(page), lang });
    return call<DeckPage>(`/match/api/tmdb/deck?${q}`);
  },
  createRoom: (viewer: Viewer, filters: RoomFilters) => post<RoomView>("/match/api/rooms", { viewer, filters }),
  sync: (code: string, viewer: Viewer) => post<RoomView>(`/match/api/rooms/${code}/sync`, { viewer }),
  vote: (code: string, viewer: Viewer, key: TitleKey, vote: Vote | null) => post<RoomView>(`/match/api/rooms/${code}/vote`, { viewer, key, vote }),
  leave: (code: string, viewer: Viewer) => post<{ ok: true }>(`/match/api/rooms/${code}/leave`, { viewer }),
};
