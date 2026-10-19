"use client";
import type { Vote } from "@wtw/core";

// Link mode keeps your swipes in the tab, so a reload or the back button never loses them.
const key = (seed: string) => `wtw.link.${seed}`;

export function loadProgress(seed: string): Record<string, Vote> {
  try { return JSON.parse(sessionStorage.getItem(key(seed)) ?? "{}") as Record<string, Vote>; } catch { return {}; }
}

export function saveProgress(seed: string, votes: Record<string, Vote>) {
  try { sessionStorage.setItem(key(seed), JSON.stringify(votes)); } catch { /* storage blocked: progress lives in memory */ }
}
