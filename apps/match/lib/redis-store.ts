import "server-only";
import { Redis } from "@upstash/redis";
import { ROOM_TTL_MS, type Ballot, type Member, type MatchRecord, type Room, type RoomMeta, type RoomStore, type TitleKey, type Vote } from "@wtw/core";

const k = (code: string, part: "meta" | "members" | "votes" | "matches") => `wtw:room:${code}:${part}`;
const PARTS = ["members", "votes", "matches"] as const;

/**
 * Rooms in Upstash. Members, votes and matches are separate hashes so concurrent writes
 * never clobber each other; matches use HSETNX so the same title is recorded once.
 */
export function createRedisStore(redis: Redis): RoomStore {
  async function touch(code: string, createdAt: number) {
    const at = Math.ceil((createdAt + ROOM_TTL_MS) / 1000);
    const p = redis.pipeline();
    for (const part of PARTS) p.expireat(k(code, part), at);
    await p.exec();
  }
  async function createdAt(code: string): Promise<number> {
    const meta = await redis.get<RoomMeta>(k(code, "meta"));
    return meta?.createdAt ?? Date.now();
  }
  return {
    kind: "redis",
    async create(meta) {
      await redis.set(k(meta.code, "meta"), meta, { px: ROOM_TTL_MS, nx: true });
    },
    async get(code) {
      const p = redis.pipeline();
      p.get<RoomMeta>(k(code, "meta"));
      for (const part of PARTS) p.hgetall(k(code, part));
      const [meta, members, votes, matches] = (await p.exec()) as [RoomMeta | null, Record<string, Member> | null, Record<string, Vote> | null, Record<string, number> | null];
      if (!meta) return null;
      const ballots: Record<string, Ballot> = {};
      for (const [field, vote] of Object.entries(votes ?? {})) {
        const [memberId, key] = field.split("|");
        if (memberId && key) (ballots[memberId] ??= {})[key] = vote;
      }
      const recorded: MatchRecord[] = Object.entries(matches ?? {}).map(([key, at]) => ({ key: key as TitleKey, at: Number(at) }));
      return { ...meta, members: Object.values(members ?? {}), ballots, matches: recorded } satisfies Room;
    },
    async upsertMember(code, member) {
      await redis.hset(k(code, "members"), { [member.id]: member });
      await touch(code, await createdAt(code));
    },
    async removeMember(code, id) {
      await redis.hdel(k(code, "members"), id);
    },
    async setVote(code, id, key, vote) {
      if (vote) await redis.hset(k(code, "votes"), { [`${id}|${key}`]: vote });
      else await redis.hdel(k(code, "votes"), `${id}|${key}`);
    },
    async addMatches(code, keys, at) {
      const p = redis.pipeline();
      for (const key of keys) p.hsetnx(k(code, "matches"), key, at);
      await p.exec();
      await touch(code, await createdAt(code));
    },
  };
}
