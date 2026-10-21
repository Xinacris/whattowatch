import { hashString } from "./random";
import type { LinkVoter } from "./link";

// Link mode on one shared browser or phone: progress and the "already swiped" marker are kept per
// person (link seed + typed name), so two people on one couch can both vote.

/**
 * The same person however the name is typed: trimmed, spaces collapsed, case folded. Every i (İ, I, ı, i)
 * folds to one letter, so "İLKER" = "ilker" on a Turkish keyboard and "ALI" = "ali" on an English one.
 */
export function voterKey(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/gu, " ").replace(/[İIı]/gu, "i").toLowerCase();
}

export const sameVoter = (a: string, b: string) => voterKey(a) === voterKey(b);

/** Adds your picks to a link's voters, replacing your earlier ones if you swiped this link before. */
export function withVoter(voters: readonly LinkVoter[], picks: LinkVoter): LinkVoter[] {
  return [...voters.filter((v) => !sameVoter(v.name, picks.name)), picks];
}

export const withoutVoter = (voters: readonly LinkVoter[], name: string) => voters.filter((v) => !sameVoter(v.name, name));

export type LinkEntry = "progress" | "voted";

/**
 * Where an entry lives for this person: `key`, plus the seed-only key it was stored under before
 * names were part of the key. Only the device's remembered name (`owner`, the one who swiped back
 * then) may claim that old entry; read it once, move it to `key`, delete it. Storage-safe characters only.
 */
export function linkEntryKeys(kind: LinkEntry, seed: string, name: string, owner: string): { key: string; legacy: string | null } {
  const base = kind === "voted" ? `wtw.link.voted.${seed}` : `wtw.link.${seed}`;
  const claims = !owner.trim() || sameVoter(name, owner);
  return { key: `${base}.${hashString(voterKey(name)).toString(36)}`, legacy: claims ? base : null };
}
