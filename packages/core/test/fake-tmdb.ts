import type { Params, RawDetail, RawListItem, RawPage, TmdbClient } from "../src";

export function movie(id: number, extra: Partial<RawListItem> = {}): RawListItem {
  return { id, title: `Movie ${id}`, release_date: "2020-01-01", poster_path: `/p${id}.jpg`, vote_average: 7, vote_count: 500, ...extra };
}

export function show(id: number, extra: Partial<RawListItem> = {}): RawListItem {
  return { id, name: `Show ${id}`, first_air_date: "2021-01-01", poster_path: `/s${id}.jpg`, vote_average: 8, vote_count: 900, ...extra };
}

/** Discover pages of 20, `total` items per type. Details derived from the id. */
export function fakeTmdb(total = 45, opts: { runtime?: (id: number) => number; failIds?: number[] } = {}): TmdbClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async get<T>(path: string, params: Params = {}): Promise<T> {
      calls.push(path);
      const disc = /^\/discover\/(movie|tv)$/.exec(path);
      if (disc) {
        const page = Number(params.page ?? 1);
        const totalPages = Math.max(1, Math.ceil(total / 20));
        const ids = Array.from({ length: 20 }, (_, i) => (page - 1) * 20 + i + 1).filter((n) => n <= total);
        const results = ids.map((n) => (disc[1] === "movie" ? movie(n) : show(n)));
        return { page, total_pages: totalPages, total_results: total, results } satisfies RawPage as T;
      }
      const det = /^\/(movie|tv)\/(\d+)$/.exec(path);
      if (det) {
        const id = Number(det[2]);
        if (opts.failIds?.includes(id)) throw new Error("boom");
        const base = det[1] === "movie" ? movie(id) : show(id);
        const d: RawDetail = {
          ...base,
          runtime: opts.runtime?.(id) ?? 100,
          genres: [{ id: 35, name: "Comedy" }, { id: 18, name: "Drama" }, { id: 80, name: "Crime" }],
          credits: { cast: [{ id: 1, name: "Şükrü Özyıldız" }] },
          "watch/providers": { results: { TR: { flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/n.png" }, { provider_id: 337, provider_name: "Disney Plus", logo_path: "/d.png" }] } } },
        };
        return d as T;
      }
      throw new Error(`unexpected ${path}`);
    },
  };
}
