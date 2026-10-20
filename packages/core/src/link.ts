import { fromBase64Url, Reader, toBase64Url, Writer } from "./bytes";
import { sanitizeFilters, type Era, type Kind, type RoomFilters } from "./filters";
import { GENRES } from "./genres";
import type { Vote } from "./match";
import { itemKey, parseItemKey, type ItemKey, type ItemKind } from "./item-key";
import { titleKey, type TitleKey } from "./tmdb/models";

// Link mode: the whole room fits in the URL.
// v1 (still decoded): filters + seed, each voter's likes/seen as sorted key sets.
// v2: the deck itself, in order, plus a 2-bit vote per deck card per voter, and a results flag.
// v3: as v2, but a deck key also says if it's a movie, a series or a film series (id * 3 + kind).

export interface LinkVoter { name: string; likes: ItemKey[]; seen: ItemKey[] }
export interface LinkPayload {
  version: 1 | 2 | 3;
  filters: RoomFilters;
  seed: string;
  /** v2/v3: exactly what the friend swipes. v1: empty, the deck comes from the seed. */
  deck: ItemKey[];
  voters: LinkVoter[];
  /** A results link: opens straight to the results, no swiping. */
  finished: boolean;
}

const KINDS: Kind[] = ["movie", "tv", "both"];
const ERAS: Era[] = ["any", "new", "classic"];
export const MAX_LINK_VOTERS = 8;
export const MAX_LINK_DECK = 60;

const ITEM_KINDS: ItemKind[] = ["movie", "tv", "collection"];

function keyToNumber(key: ItemKey): number {
  const p = parseItemKey(key);
  return p ? p.id * 3 + ITEM_KINDS.indexOf(p.kind) : -1;
}

const numberToKey = (n: number): ItemKey => itemKey(ITEM_KINDS[n % 3] as ItemKind, Math.floor(n / 3));

/** v1 and v2 knew only titles: id * 2 + (tv ? 1 : 0). */
const numberToKeyV2 = (n: number): TitleKey => titleKey(n % 2 === 1 ? "tv" : "movie", Math.floor(n / 2));

/** v1 key sets: sorted, deltas always positive. */
function readKeys(r: Reader): ItemKey[] {
  const count = r.varint();
  if (count > 5000) throw new RangeError("too many keys");
  const out: ItemKey[] = [];
  let prev = 0;
  for (let i = 0; i < count; i++) { prev += r.varint(); out.push(numberToKeyV2(prev)); }
  return out;
}

const zig = (n: number) => (n >= 0 ? n * 2 : -n * 2 - 1);
const unzig = (z: number) => (z % 2 === 0 ? z / 2 : -(z + 1) / 2);

/** v2/v3 deck: order kept, each id as a zigzag delta from the one before. */
function writeDeck(w: Writer, deck: readonly ItemKey[]): void {
  w.varint(deck.length);
  let prev = 0;
  for (const n of deck.map(keyToNumber)) { w.varint(zig(n - prev)); prev = n; }
}

function readDeck(r: Reader, toKey: (n: number) => ItemKey): ItemKey[] {
  const count = r.varint();
  if (count > MAX_LINK_DECK) throw new RangeError("deck too long");
  const out: ItemKey[] = [];
  let prev = 0;
  for (let i = 0; i < count; i++) {
    prev += unzig(r.varint());
    if (prev < 0) throw new RangeError("bad key");
    out.push(toKey(prev));
  }
  return out;
}

// 0 = not voted, 1 = yes, 2 = no, 3 = seen it. Four cards per byte.
function writeVotes(w: Writer, deck: readonly ItemKey[], v: LinkVoter): void {
  const likes = new Set(v.likes);
  const seen = new Set(v.seen);
  const codes = deck.map((k) => (likes.has(k) ? 1 : seen.has(k) ? 3 : 2));
  for (let i = 0; i < codes.length; i += 4) {
    w.byte(codes.slice(i, i + 4).reduce((b, c, j) => b | (c << (j * 2)), 0));
  }
}

function readVotes(r: Reader, deck: readonly ItemKey[], name: string): LinkVoter {
  const v: LinkVoter = { name, likes: [], seen: [] };
  for (let i = 0; i < deck.length; i += 4) {
    const b = r.byte();
    deck.slice(i, i + 4).forEach((k, j) => {
      const c = (b >> (j * 2)) & 3;
      if (c === 1) v.likes.push(k);
      if (c === 3) v.seen.push(k);
    });
  }
  return v;
}

function writeFilters(w: Writer, f: RoomFilters): void {
  w.byte(KINDS.indexOf(f.kind)).byte(ERAS.indexOf(f.era));
  w.byte(f.region.charCodeAt(0)).byte(f.region.charCodeAt(1));
  w.varint(f.maxRuntime ?? 0);
  const providers = [...f.providers].sort((a, b) => a - b);
  w.varint(providers.length);
  let prev = 0;
  for (const p of providers) { w.varint(p - prev); prev = p; }
  const genreIdx = f.genres.map((s) => GENRES.findIndex((g) => g.slug === s)).filter((i) => i >= 0);
  w.varint(genreIdx.length);
  for (const i of genreIdx) w.byte(i);
}

function readFilters(r: Reader): RoomFilters {
  const kind = KINDS[r.byte()];
  const era = ERAS[r.byte()];
  const region = String.fromCharCode(r.byte(), r.byte());
  const maxRuntime = r.varint() || null;
  const providers: number[] = [];
  let prev = 0;
  for (let i = 0, n = r.varint(); i < n; i++) { prev += r.varint(); providers.push(prev); }
  const genres: string[] = [];
  for (let i = 0, n = r.varint(); i < n; i++) { const g = GENRES[r.byte()]; if (g) genres.push(g.slug); }
  return sanitizeFilters({ kind, era, region, maxRuntime, providers, genres });
}

export function encodeLink(p: Omit<LinkPayload, "version">): string {
  const deck = p.deck.slice(0, MAX_LINK_DECK);
  const w = new Writer().byte(3).byte(p.finished ? 1 : 0);
  writeFilters(w, p.filters);
  w.string(p.seed);
  writeDeck(w, deck);
  const voters = p.voters.slice(-MAX_LINK_VOTERS);
  w.varint(voters.length);
  for (const v of voters) { w.string(v.name.slice(0, 40)); writeVotes(w, deck, v); }
  return toBase64Url(w.done());
}

function decodeV1(r: Reader): LinkPayload | null {
  const filters = readFilters(r);
  const seed = r.string();
  if (!seed) return null;
  const voters: LinkVoter[] = [];
  for (let i = 0, n = Math.min(r.varint(), MAX_LINK_VOTERS); i < n; i++) {
    voters.push({ name: r.string(), likes: readKeys(r), seen: readKeys(r) });
  }
  return { version: 1, filters, seed, deck: [], voters, finished: false };
}

function decodeDeckLink(r: Reader, version: 2 | 3): LinkPayload | null {
  const finished = r.byte() === 1;
  const filters = readFilters(r);
  const seed = r.string();
  if (!seed) return null;
  const deck = readDeck(r, version === 2 ? numberToKeyV2 : numberToKey);
  const voters: LinkVoter[] = [];
  const n = r.varint();
  if (n > MAX_LINK_VOTERS) return null;
  for (let i = 0; i < n; i++) voters.push(readVotes(r, deck, r.string()));
  return { version, filters, seed, deck, voters, finished };
}

/** Returns null on anything malformed: a mangled link should land on a friendly page, not a crash. */
export function decodeLink(token: string): LinkPayload | null {
  try {
    const r = new Reader(fromBase64Url(token.trim()));
    const version = r.byte();
    return version === 1 ? decodeV1(r) : version === 2 || version === 3 ? decodeDeckLink(r, version) : null;
  } catch {
    return null;
  }
}

/** v1 links were written under the old 10-card first round; their decks keep that size. */
const V1_ROUND_FIRST = 10;

/** Old v1 links: the friend swipes the first max(10, initiator's votes) cards of the seed deck. */
export function v1DeckSize(p: LinkPayload): number {
  const first = p.voters[0];
  return Math.max(V1_ROUND_FIRST, first ? new Set([...first.likes, ...first.seen]).size : 0);
}

export type LinkStage = "start" | "swipe" | "waiting" | "results" | "solo";

/**
 * What a link should show. `votedHere` = this device already swiped this deck (kept per seed),
 * so the initiator opening their own link gets "waiting for your friend", not a second deck.
 */
export function linkStage(p: LinkPayload, votedHere: boolean): LinkStage {
  if (p.finished) return p.voters.length >= 2 ? "results" : "solo";
  if (votedHere) return p.voters.length >= 2 ? "results" : "waiting";
  return p.voters.length === 0 ? "start" : "swipe";
}

/** Your picks as a link voter, in deck order. */
export function picksOf(name: string, deck: readonly ItemKey[], votes: Readonly<Record<string, Vote>>): LinkVoter {
  return { name, likes: deck.filter((k) => votes[k] === "like"), seen: deck.filter((k) => votes[k] === "seen") };
}

/** The deck everyone swipes from here on. v1 links never carried one, so it's whatever this device loaded. */
export const linkDeck = (p: LinkPayload, loaded: readonly ItemKey[]): ItemKey[] => (p.version === 1 ? [...loaded] : p.deck);

export function nextLink(p: LinkPayload, deck: readonly ItemKey[], voters: LinkVoter[], finished: boolean): string {
  return encodeLink({ filters: p.filters, seed: p.seed, deck: [...deck], voters, finished });
}

/** Zero overlap: same filters, fresh seed, the other person starts. */
export const swapLink = (p: LinkPayload, seed: string) => encodeLink({ filters: p.filters, seed, deck: [], voters: [], finished: false });

export const freshLink = (filters: RoomFilters, seed: string) => encodeLink({ filters, seed, deck: [], voters: [], finished: false });
