"use client";
import type { Vote } from "@wtw/core";

// Link mode keeps your swipes in the tab, so a reload or the back button never loses them.
const key = (seed: string) => `wtw.link.${seed}`;
const votedKey = (seed: string) => `wtw.link.voted.${seed}`;

export function loadProgress(seed: string): Record<string, Vote> {
  try { return JSON.parse(sessionStorage.getItem(key(seed)) ?? "{}") as Record<string, Vote>; } catch { return {}; }
}

export function saveProgress(seed: string, votes: Record<string, Vote>) {
  try { sessionStorage.setItem(key(seed), JSON.stringify(votes)); } catch { /* storage blocked: progress lives in memory */ }
}

/** This device already swiped this deck. Kept across tabs, so your own link shows "waiting", not a second deck. */
export function votedHere(seed: string): boolean {
  try { return localStorage.getItem(votedKey(seed)) === "1"; } catch { return false; }
}

export function markVoted(seed: string) {
  try { localStorage.setItem(votedKey(seed), "1"); } catch { /* private mode: the tab remembers via the URL */ }
}
