import { fromBase64Url, Reader, toBase64Url, Writer } from "./bytes";
import { sanitizeFilters, type Era, type Kind, type RoomFilters } from "./filters";
import { GENRES } from "./genres";
import { currentMatches, type Ballot } from "./match";
import { parseTitleKey, titleKey, type TitleKey } from "./tmdb/models";

// Link mode: the whole room fits in the URL. Deck = filters + seed. Each voter adds their picks.

export interface LinkVoter { name: string; likes: TitleKey[]; seen: TitleKey[] }
export interface LinkPayload { filters: RoomFilters; seed: string; voters: LinkVoter[] }

const VERSION = 1;
const KINDS: Kind[] = ["movie", "tv", "both"];
const ERAS: Era[] = ["any", "new", "classic"];
export const MAX_LINK_VOTERS = 8;

function keyToNumber(key: TitleKey): number {
  const p = parseTitleKey(key);
  return p ? p.id * 2 + (p.type === "tv" ? 1 : 0) : -1;
}

function numberToKey(n: number): TitleKey {
  return titleKey(n % 2 === 1 ? "tv" : "movie", Math.floor(n / 2));
}

function writeKeys(w: Writer, keys: readonly TitleKey[]): void {
  const nums = [...new Set(keys.map(keyToNumber).filter((n) => n >= 0))].sort((a, b) => a - b);
  w.varint(nums.length);
  let prev = 0;
  for (const n of nums) { w.varint(n - prev); prev = n; }
}

function readKeys(r: Reader): TitleKey[] {
  const count = r.varint();
  if (count > 5000) throw new RangeError("too many keys");
  const out: TitleKey[] = [];
  let prev = 0;
  for (let i = 0; i < count; i++) { prev += r.varint(); out.push(numberToKey(prev)); }
  return out;
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

export function encodeLink(p: LinkPayload): string {
  const w = new Writer().byte(VERSION);
  writeFilters(w, p.filters);
  w.string(p.seed);
  const voters = p.voters.slice(-MAX_LINK_VOTERS);
  w.varint(voters.length);
  for (const v of voters) { w.string(v.name.slice(0, 40)); writeKeys(w, v.likes); writeKeys(w, v.seen); }
  return toBase64Url(w.done());
}

/** Returns null on anything malformed: a mangled link should land on a friendly page, not a crash. */
export function decodeLink(token: string): LinkPayload | null {
  try {
    const r = new Reader(fromBase64Url(token.trim()));
    if (r.byte() !== VERSION) return null;
    const filters = readFilters(r);
    const seed = r.string();
    if (!seed) return null;
    const voters: LinkVoter[] = [];
    for (let i = 0, n = Math.min(r.varint(), MAX_LINK_VOTERS); i < n; i++) {
      voters.push({ name: r.string(), likes: readKeys(r), seen: readKeys(r) });
    }
    return { filters, seed, voters };
  } catch {
    return null;
  }
}

export function ballotOf(v: Pick<LinkVoter, "likes" | "seen">): Ballot {
  const b: Ballot = {};
  for (const k of v.likes) b[k] = "like";
  for (const k of v.seen) b[k] = "seen";
  return b;
}

/** Link-mode matches: everyone in the link plus the person holding the phone. Keeps deck order. */
export function linkMatches(voters: readonly LinkVoter[], deckOrder: readonly TitleKey[] = []): TitleKey[] {
  const ballots = Object.fromEntries(voters.map((v, i) => [String(i), ballotOf(v)]));
  const found = currentMatches(voters.map((_, i) => String(i)), ballots);
  const pos = (k: TitleKey) => { const i = deckOrder.indexOf(k); return i < 0 ? Number.MAX_SAFE_INTEGER : i; };
  return found.sort((a, b) => pos(a) - pos(b));
}
