"use client";
import { linkEntryKeys, type LinkEntry, type Vote } from "@wtw/core";
import { getViewer } from "./viewer";

// Link mode keeps your swipes in the tab (a reload or the back button never loses them) and marks
// "already swiped" across tabs. Both per person, so two people on one browser can each vote.

type Store = "sessionStorage" | "localStorage";

/** Reads this person's entry; an entry from before names were in the key moves over once, for the person who made it. */
function read(store: Store, kind: LinkEntry, seed: string, name: string): string | null {
  try {
    const s = window[store];
    const { key, legacy } = linkEntryKeys(kind, seed, name, getViewer().name);
    const now = s.getItem(key);
    if (now !== null || !legacy) return now;
    const old = s.getItem(legacy);
    if (old !== null) { s.setItem(key, old); s.removeItem(legacy); }
    return old;
  } catch { return null; }
}

function write(store: Store, kind: LinkEntry, seed: string, name: string, value: string | null) {
  try {
    const { key } = linkEntryKeys(kind, seed, name, "");
    if (value === null) window[store].removeItem(key); else window[store].setItem(key, value);
  } catch { /* storage blocked: progress lives in memory, the link itself carries the votes */ }
}

export function loadProgress(seed: string, name: string): Record<string, Vote> {
  try { return JSON.parse(read("sessionStorage", "progress", seed, name) ?? "{}") as Record<string, Vote>; } catch { return {}; }
}

export const saveProgress = (seed: string, name: string, votes: Record<string, Vote>) => write("sessionStorage", "progress", seed, name, JSON.stringify(votes));

/** This person already swiped this deck on this browser, so their own link shows "waiting", not a second deck. */
export const votedHere = (seed: string, name: string) => read("localStorage", "voted", seed, name) === "1";

export const markVoted = (seed: string, name: string) => write("localStorage", "voted", seed, name, "1");

/** "Swipe again as …": forget this person's swipes on this link. */
export function forgetVote(seed: string, name: string) {
  write("localStorage", "voted", seed, name, null);
  write("sessionStorage", "progress", seed, name, null);
}
