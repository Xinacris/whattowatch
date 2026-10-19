/** Tape-label runtime: 112 -> "1H 52M", 45 -> "45M", 120 -> "2H". */
export function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}M`;
  return m === 0 ? `${h}H` : `${h}H ${m}M`;
}

export function yearOf(date: string | null | undefined): number | null {
  if (!date || date.length < 4) return null;
  const y = Number(date.slice(0, 4));
  return Number.isFinite(y) && y > 0 ? y : null;
}

export function formatRating(vote: number | null | undefined): string | null {
  if (!vote) return null;
  return vote.toFixed(1);
}

const IMG = "https://image.tmdb.org/t/p";
export type ImageSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original";

export function tmdbImage(path: string | null | undefined, size: ImageSize = "w500"): string | null {
  return path ? `${IMG}/${size}${path}` : null;
}
