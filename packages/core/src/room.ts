import type { RoomFilters } from "./filters";
import type { Ballot, Vote } from "./match";
import { matchesFromVoters } from "./results";
import { CODE_LENGTH } from "./room-code";
import { LIKE_TARGET, MAX_VOTED, ROUND_EXTRA, ROUND_FIRST } from "./rounds";
import type { ItemKey } from "./item-key";

export const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
/** Poll every 2s; three missed polls and a few seconds' grace means you've left the couch. */
export const POLL_MS = 2000;
export const PRESENCE_MS = 15_000;
export const MAX_MEMBERS = 12;

/** Who is using the app. Anonymous today; `getViewer()` in each app is the seam for login later. */
export interface Viewer { id: string; name: string }

/** `dealt` = how long the deck was at their last poll, so someone who finished and left still counts after a later extension. */
export interface Member extends Viewer { joinedAt: number; lastSeen: number; dealt?: number }

export interface RoomMeta { code: string; filters: RoomFilters; seed: string; createdAt: number; hostId: string }

/**
 * The room's shared deck. `pool` holds titles already fetched but not dealt yet. `series` = film
 * series already in deck or pool, so a later page can't deal Shrek 2 after the Shrek series card.
 * (Rooms made before series existed have no `series`.)
 */
export interface DeckBook { deck: ItemKey[]; pool: ItemKey[]; page: number; exhausted: boolean; series?: number[] }

/** Results, computed once when the round is done and never again: presence can't change a finished night. */
export interface FinalResults { results: ItemKey[]; voters: Viewer[]; deckLength: number; at: number }

/** `final` is missing until the room is done (and on rooms stored before v2.6). */
export interface Room extends RoomMeta { members: Member[]; ballots: Record<string, Ballot>; book: DeckBook; final?: FinalResults }

/** What a client sees on each poll. Ballots stay server-side; you only get your own. */
export interface RoomView extends RoomMeta {
  members: Member[];
  mine: Ballot;
  deck: ItemKey[];
  /** Names of present members with cards left. */
  waitingOn: string[];
  done: boolean;
  /** Only once the room is done: nobody sees a result before everyone finishes. */
  results: ItemKey[] | null;
  /** Names of who the results were computed from, once done. */
  voters: string[] | null;
  expiresAt: number;
}

/** Pulls one discover page of keys, with the series each belongs to. Injected so core never talks to TMDB on its own. */
export type DealPage = (filters: RoomFilters, seed: string, page: number) => Promise<{ keys: ItemKey[]; done: boolean; series?: Record<string, number> }>;

export type RoomResult<T> = { ok: true; value: T } | { ok: false; reason: "not_found" | "expired" | "full" | "bad_code" };

export interface RoomStore {
  readonly kind: "redis" | "memory";
  create(meta: RoomMeta, book: DeckBook): Promise<void>;
  get(code: string): Promise<Room | null>;
  upsertMember(code: string, member: Member): Promise<void>;
  removeMember(code: string, memberId: string): Promise<void>;
  setVote(code: string, memberId: string, key: ItemKey, vote: Vote | null): Promise<void>;
  /** Replaces the book only if the deck is still `fromLength` long. Two members finishing together extend once. */
  extendDeck(code: string, fromLength: number, book: DeckBook): Promise<boolean>;
  /** Stores the results once, if none are stored yet and the deck is still `fromLength` long. Two members finishing together write once. */
  finish(code: string, fromLength: number, final: FinalResults): Promise<boolean>;
}

export function presentMembers(members: readonly Member[], now: number): Member[] {
  return members.filter((m) => now - m.lastSeen <= PRESENCE_MS).sort((a, b) => a.joinedAt - b.joinedAt);
}

export function isExpired(meta: Pick<RoomMeta, "createdAt">, now: number): boolean {
  return now - meta.createdAt > ROOM_TTL_MS;
}

const MAX_DEAL_PAGES = 6;

/** Moves titles from the pool into the deck until it holds `size`, fetching pages as needed. */
export async function fillBook(book: DeckBook, size: number, filters: RoomFilters, seed: string, deal: DealPage): Promise<DeckBook> {
  let { pool, page, exhausted } = book;
  const have = new Set<string>([...book.deck, ...pool]);
  const series = new Set(book.series ?? []);
  for (let n = 0; book.deck.length + pool.length < size && !exhausted && n < MAX_DEAL_PAGES; n++) {
    const res = await deal(filters, seed, page);
    for (const k of res.keys) {
      const s = res.series?.[k] ?? null;
      if (have.has(k) || (s !== null && series.has(s))) continue;
      have.add(k);
      if (s !== null) series.add(s);
      pool = [...pool, k];
    }
    page += 1;
    exhausted = res.done;
  }
  const take = Math.max(0, size - book.deck.length);
  return { deck: [...book.deck, ...pool.slice(0, take)], pool: pool.slice(take), page, exhausted: exhausted && pool.length <= take, series: [...series] };
}

export interface RoomRound { done: boolean; pending: string[]; extendTo: number | null }

/**
 * The round rule for a room: when every present member has voted on every card, and anyone is
 * under five yeses, deal five more for everyone, up to 30. Nobody stops early: matches need
 * overlapping votes. Otherwise the room is done.
 */
export function roomRound(book: DeckBook, ballots: Readonly<Record<string, Ballot>>, present: readonly string[]): RoomRound {
  const pending = present.filter((id) => book.deck.some((k) => !ballots[id]?.[k]));
  if (!present.length || pending.length) return { done: false, pending, extendTo: null };
  const below = present.some((id) => book.deck.filter((k) => ballots[id]?.[k] === "like").length < LIKE_TARGET);
  const canGrow = book.deck.length < MAX_VOTED && (book.pool.length > 0 || !book.exhausted);
  if (below && canGrow) return { done: false, pending, extendTo: Math.min(MAX_VOTED, book.deck.length + ROUND_EXTRA) };
  return { done: true, pending, extendTo: null };
}

export async function firstBook(filters: RoomFilters, seed: string, deal: DealPage): Promise<DeckBook> {
  return fillBook({ deck: [], pool: [], page: 0, exhausted: false }, ROUND_FIRST, filters, seed, deal);
}

/** Left (no heartbeat) after voting on every card they were dealt. They count in the results, but never block or extend a round. */
export function departedFinished(room: Pick<Room, "members" | "ballots" | "book">, now: number): Member[] {
  const present = new Set(presentMembers(room.members, now).map((m) => m.id));
  return room.members
    .filter((m) => {
      const dealt = room.book.deck.slice(0, m.dealt ?? room.book.deck.length);
      return !present.has(m.id) && dealt.length > 0 && dealt.every((k) => room.ballots[m.id]?.[k]);
    })
    .sort((a, b) => a.joinedAt - b.joinedAt);
}

/** Present members plus those who left after finishing (#7): everyone the results are made from. */
function votersOf(room: Room, now: number): Member[] {
  return [...presentMembers(room.members, now), ...departedFinished(room, now)];
}

function finalOf(room: Room, now: number): FinalResults {
  const voters = votersOf(room, now);
  const picks = voters.map((m) => {
    const b = room.ballots[m.id] ?? {};
    return { likes: room.book.deck.filter((k) => b[k] === "like"), seen: room.book.deck.filter((k) => b[k] === "seen") };
  });
  // No seriesOf: a room deck never holds a film next to its own series card (fillBook skips both ways).
  return { results: matchesFromVoters(room.book.deck, picks), voters: voters.map(({ id, name }) => ({ id, name })), deckLength: room.book.deck.length, at: now };
}

export function toView(room: Room, viewerId: string, now: number): RoomView {
  const members = presentMembers(room.members, now);
  const meta = { code: room.code, filters: room.filters, seed: room.seed, createdAt: room.createdAt, hostId: room.hostId, expiresAt: room.createdAt + ROOM_TTL_MS };
  const { final } = room;
  if (final) {
    // Done for good. Only the people who voted keep their deck; anyone else just sees the results.
    const voted = final.voters.some((v) => v.id === viewerId);
    return { ...meta, members, mine: voted ? (room.ballots[viewerId] ?? {}) : {}, deck: voted ? room.book.deck : [], waitingOn: [], done: true, results: final.results, voters: final.voters.map((v) => v.name) };
  }
  const round = roomRound(room.book, room.ballots, members.map((m) => m.id));
  const computed = round.done ? finalOf(room, now) : null;
  return {
    ...meta,
    members,
    mine: room.ballots[viewerId] ?? {},
    deck: room.book.deck,
    waitingOn: members.filter((m) => round.pending.includes(m.id)).map((m) => m.name),
    done: round.done,
    results: computed?.results ?? null,
    voters: computed?.voters.map((v) => v.name) ?? null,
  };
}

async function load(store: RoomStore, code: string, now: number): Promise<RoomResult<Room>> {
  if (code.length !== CODE_LENGTH) return { ok: false, reason: "bad_code" };
  const room = await store.get(code);
  if (!room) return { ok: false, reason: "not_found" };
  if (isExpired(room, now)) return { ok: false, reason: "expired" };
  return { ok: true, value: room };
}

/** Join or heartbeat. Also where the room deals more cards, so any member's poll settles a round. */
export async function syncRoom(store: RoomStore, code: string, viewer: Viewer, now: number, deal?: DealPage): Promise<RoomResult<RoomView>> {
  const loaded = await load(store, code, now);
  if (!loaded.ok) return loaded;
  const room = loaded.value;
  const existing = room.members.find((m) => m.id === viewer.id);
  if (room.final) { // a finished night: heartbeat for those who were there, nobody new takes a seat, nothing is dealt
    if (existing) await store.upsertMember(code, { ...existing, name: viewer.name, lastSeen: now });
    return { ok: true, value: toView(room, viewer.id, now) };
  }
  if (!existing && presentMembers(room.members, now).length >= MAX_MEMBERS) return { ok: false, reason: "full" };
  const member: Member = { id: viewer.id, name: viewer.name, joinedAt: existing?.joinedAt ?? now, lastSeen: now };
  const members = [...room.members.filter((m) => m.id !== viewer.id), member];
  const present = presentMembers(members, now).map((m) => m.id);
  const round = roomRound(room.book, room.ballots, present);
  let book = room.book;
  if (round.extendTo && deal) {
    const next = await fillBook(book, round.extendTo, room.filters, room.seed, deal).catch(() => null);
    const grown = next ?? book;
    // A dry shelf still gets written, as exhausted, so the room can finish.
    const final = grown.deck.length > book.deck.length ? grown : { ...grown, exhausted: true, pool: [] };
    if (next && (await store.extendDeck(code, book.deck.length, final))) book = final;
    else book = (await store.get(code))?.book ?? book;
  }
  member.dealt = book.deck.length;
  await store.upsertMember(code, member);
  const settled: Room = { ...room, members, book };
  if (!roomRound(book, room.ballots, present).done) return { ok: true, value: toView(settled, viewer.id, now) };
  // Done: store the results once. Whoever loses the race reads the winner's.
  const final = finalOf(settled, now);
  const stored = (await store.finish(code, book.deck.length, final)) ? final : ((await store.get(code))?.final ?? final);
  return { ok: true, value: toView({ ...settled, final: stored }, viewer.id, now) };
}

export async function castVote(store: RoomStore, code: string, viewer: Viewer, key: ItemKey, vote: Vote | null, now: number, deal?: DealPage): Promise<RoomResult<RoomView>> {
  const loaded = await load(store, code, now);
  if (!loaded.ok) return loaded;
  if (loaded.value.final || !loaded.value.book.deck.includes(key)) return syncRoom(store, code, viewer, now, deal);
  await store.setVote(code, viewer.id, key, vote);
  return syncRoom(store, code, viewer, now, deal);
}

/** Dev and tests only. Production uses Redis, or tells people to use link mode. */
export function createMemoryStore(): RoomStore {
  const rooms = new Map<string, Room>();
  const must = (code: string) => {
    const r = rooms.get(code);
    if (!r) throw new Error(`no room ${code}`);
    return r;
  };
  return {
    kind: "memory",
    async create(meta, book) { rooms.set(meta.code, { ...meta, members: [], ballots: {}, book }); },
    async get(code) { const r = rooms.get(code); return r ? (JSON.parse(JSON.stringify(r)) as Room) : null; },
    async upsertMember(code, member) { const r = must(code); r.members = [...r.members.filter((m) => m.id !== member.id), member]; },
    async removeMember(code, id) { const r = must(code); r.members = r.members.filter((m) => m.id !== id); },
    async setVote(code, id, key, vote) {
      const r = must(code);
      const ballot = { ...(r.ballots[id] ?? {}) };
      if (vote) ballot[key] = vote; else delete ballot[key];
      r.ballots[id] = ballot;
    },
    async extendDeck(code, fromLength, book) {
      const r = must(code);
      if (r.book.deck.length !== fromLength) return false;
      r.book = book;
      return true;
    },
    async finish(code, fromLength, final) {
      const r = must(code);
      if (r.final || r.book.deck.length !== fromLength) return false;
      r.final = final;
      return true;
    },
  };
}
