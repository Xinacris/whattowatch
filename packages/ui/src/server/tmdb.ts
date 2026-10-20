import "server-only";
import { createTmdbClient, type TmdbClient } from "@wtw/core";

let client: TmdbClient | null = null;

const HOUR = 3600;
/** Lists move hourly; a title's details and a series' parts barely move, so they keep for a week. */
function revalidateFor(path: string): number {
  if (path.startsWith("/trending") || path.startsWith("/discover")) return HOUR;
  if (/^\/(movie|tv|collection)\/\d+$/.test(path)) return 7 * 24 * HOUR;
  return 24 * HOUR;
}

/** The only place a TMDB credential is read. Server-only: importing this from a client component fails the build. */
export function tmdb(): TmdbClient {
  if (client) return client;
  const credential = process.env.TMDB_READ_TOKEN;
  if (!credential) throw new Error("TMDB_READ_TOKEN is not set");
  client = createTmdbClient({
    credential,
    init: (path) => ({ next: { revalidate: revalidateFor(path) } }) as RequestInit,
  });
  return client;
}
