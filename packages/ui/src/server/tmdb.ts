import "server-only";
import { createTmdbClient, type TmdbClient } from "@wtw/core";

let client: TmdbClient | null = null;

/** The only place a TMDB credential is read. Server-only: importing this from a client component fails the build. */
export function tmdb(): TmdbClient {
  if (client) return client;
  const credential = process.env.TMDB_READ_TOKEN;
  if (!credential) throw new Error("TMDB_READ_TOKEN is not set");
  client = createTmdbClient({
    credential,
    init: (path) => ({ next: { revalidate: path.startsWith("/trending") || path.startsWith("/discover") ? 3600 : 86400 } }) as RequestInit,
  });
  return client;
}
