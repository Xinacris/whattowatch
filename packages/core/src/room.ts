import type { RoomFilters } from "./filters";
import { currentMatches, recordMatches, type Ballot, type MatchRecord, type Vote } from "./match";
import { CODE_LENGTH } from "./room-code";
import type { TitleKey } from "./tmdb/models";

export const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
/** Poll every 2s; three missed polls and a few seconds' grace means you've left the couch. */
export const POLL_MS = 2000;
export const PRESENCE_MS = 15_000;
export const MAX_MEMBERS = 12;

/** Who is using the app. Anonymous today; `getViewer()` in each app is the seam for login later. */
export interface Viewer { id: string; name: string }

export interface Member extends Viewer { joinedAt: number; lastSeen: number }

export interface RoomMeta { code: string; filters: RoomFilters; seed: string; createdAt: number; hostId: string }

export interface Room extends RoomMeta { members: Member[]; ballots: Record<string, Ballot>; matches: MatchRecord[] }

/** What a client sees on each poll. Ballots stay server-side; you only get your own. */
export interface RoomView extends RoomMeta { members: Member[]; mine: Ballot; matches: MatchRecord[]; expiresAt: number }

export type RoomResult<T> = { ok: true; value: T } | { ok: false; reason: "not_found" | "expired" | "full" | "bad_code" };

export interface RoomStore {
  readonly kind: "redis" | "memory";
  create(meta: RoomMeta): Promise<void>;
  get(code: string): Promise<Room | null>;
  upsertMember(code: string, member: Member): Promise<void>;
  removeMember(code: string, memberId: string): Promise<void>;
  setVote(code: string, memberId: string, key: TitleKey, vote: Vote | null): Promise<void>;
  /** Must be idempotent per key: two people landing the last like together record one match. */
  addMatches(code: string, keys: TitleKey[], at: number): Promise<void>;
}

export function presentMembers(members: readonly Member[], now: number): Member[] {
  return members.filter((m) => now - m.lastSeen <= PRESENCE_MS).sort((a, b) => a.joinedAt - b.joinedAt);
}

export function isExpired(meta: Pick<RoomMeta, "createdAt">, now: number): boolean {
  return now - meta.createdAt > ROOM_TTL_MS;
}

export function toView(room: Room, viewerId: string, now: number): RoomView {
  return {
    code: room.code, filters: room.filters, seed: room.seed, createdAt: room.createdAt, hostId: room.hostId,
    members: presentMembers(room.members, now),
    mine: room.ballots[viewerId] ?? {},
    matches: room.matches,
    expiresAt: room.createdAt + ROOM_TTL_MS,
  };
}

async function load(store: RoomStore, code: string, now: number): Promise<RoomResult<Room>> {
  if (code.length !== CODE_LENGTH) return { ok: false, reason: "bad_code" };
  const room = await store.get(code);
  if (!room) return { ok: false, reason: "not_found" };
  if (isExpired(room, now)) return { ok: false, reason: "expired" };
  return { ok: true, value: room };
}

/** Join or heartbeat. Also the place matches get recorded, so any member's poll settles them. */
export async function syncRoom(store: RoomStore, code: string, viewer: Viewer, now: number): Promise<RoomResult<RoomView>> {
  const loaded = await load(store, code, now);
  if (!loaded.ok) return loaded;
  const room = loaded.value;
  const existing = room.members.find((m) => m.id === viewer.id);
  if (!existing && presentMembers(room.members, now).length >= MAX_MEMBERS) return { ok: false, reason: "full" };
  const member: Member = { id: viewer.id, name: viewer.name, joinedAt: existing?.joinedAt ?? now, lastSeen: now };
  await store.upsertMember(code, member);
  const members = [...room.members.filter((m) => m.id !== viewer.id), member];
  const present = presentMembers(members, now).map((m) => m.id);
  const fresh = currentMatches(present, room.ballots).filter((k) => !room.matches.some((m) => m.key === k));
  if (fresh.length) await store.addMatches(code, fresh, now);
  const matches = fresh.length ? recordMatches(room.matches, fresh, now) : room.matches;
  return { ok: true, value: toView({ ...room, members, matches }, viewer.id, now) };
}

export async function castVote(store: RoomStore, code: string, viewer: Viewer, key: TitleKey, vote: Vote | null, now: number): Promise<RoomResult<RoomView>> {
  const loaded = await load(store, code, now);
  if (!loaded.ok) return loaded;
  await store.setVote(code, viewer.id, key, vote);
  return syncRoom(store, code, viewer, now);
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
    async create(meta) { rooms.set(meta.code, { ...meta, members: [], ballots: {}, matches: [] }); },
    async get(code) { const r = rooms.get(code); return r ? (JSON.parse(JSON.stringify(r)) as Room) : null; },
    async upsertMember(code, member) { const r = must(code); r.members = [...r.members.filter((m) => m.id !== member.id), member]; },
    async removeMember(code, id) { const r = must(code); r.members = r.members.filter((m) => m.id !== id); },
    async setVote(code, id, key, vote) {
      const r = must(code);
      const ballot = { ...(r.ballots[id] ?? {}) };
      if (vote) ballot[key] = vote; else delete ballot[key];
      r.ballots[id] = ballot;
    },
    async addMatches(code, keys, at) { const r = must(code); r.matches = recordMatches(r.matches, keys, at); },
  };
}
