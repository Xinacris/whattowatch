import { notFound } from "next/navigation";
import { TmdbError } from "@wtw/core";

/** TMDB 404 becomes our not-found page; anything else bubbles to error.tsx. */
export async function orNotFound<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (err) {
    if (err instanceof TmdbError && err.status === 404) notFound();
    throw err;
  }
}

export const isId = (s: string) => /^\d{1,9}$/.test(s);
