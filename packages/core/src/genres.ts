// TMDB uses different genre ids for movies and TV. Rooms pick from this one list.
// `tv: null` means TV has no honest equivalent, so TV is skipped when only those are picked.

export interface Genre { slug: string; movie: number | null; tv: number | null }

export const GENRES: readonly Genre[] = [
  { slug: "action", movie: 28, tv: 10759 },
  { slug: "comedy", movie: 35, tv: 35 },
  { slug: "drama", movie: 18, tv: 18 },
  { slug: "thriller", movie: 53, tv: null },
  { slug: "horror", movie: 27, tv: null },
  { slug: "scifi", movie: 878, tv: 10765 },
  { slug: "crime", movie: 80, tv: 80 },
  { slug: "romance", movie: 10749, tv: null },
  { slug: "animation", movie: 16, tv: 16 },
  { slug: "documentary", movie: 99, tv: 99 },
  { slug: "mystery", movie: 9648, tv: 9648 },
  { slug: "family", movie: 10751, tv: 10751 },
  { slug: "fantasy", movie: 14, tv: 10765 },
  { slug: "war", movie: 10752, tv: 10768 },
] as const;

export const MAX_GENRES = 3;

export function genreIdsFor(slugs: readonly string[], type: "movie" | "tv"): number[] {
  const ids = slugs.map((s) => GENRES.find((g) => g.slug === s)?.[type]).filter((n): n is number => typeof n === "number");
  return [...new Set(ids)];
}
