import "server-only";
import { Redis } from "@upstash/redis";
import { ROOM_TTL_MS, type Ballot, type DeckBook, type Member, type Room, type RoomMeta, type RoomStore, type Vote } from "@wtw/core";

const k = (code: string, part: string) => `wtw:room:${code}:${part}`;
const HASHES = ["members", "votes"] as const;

/**
 * Rooms in Upstash. Members and votes are separate hashes so concurrent writes never clobber
 * each other. The deck lives in `book`; extending it is gated by SET NX on the old length,
 * so two members finishing together deal five more cards once.
 */
export function createRedisStore(redis: Redis): RoomStore {
  async function touch(code: string) {
    const meta = await redis.get<RoomMeta>(k(code, "meta"));
    const at = Math.ceil(((meta?.createdAt ?? Date.now()) + ROOM_TTL_MS) / 1000);
    const p = redis.pipeline();
    for (const part of HASHES) p.expireat(k(code, part), at);
    await p.exec();
  }
  return {
    kind: "redis",
    async create(meta, book) {
      const p = redis.pipeline();
      p.set(k(meta.code, "meta"), meta, { px: ROOM_TTL_MS, nx: true });
      p.set(k(meta.code, "book"), book, { px: ROOM_TTL_MS });
      await p.exec();
    },
    async get(code) {
      const p = redis.pipeline();
      p.get<RoomMeta>(k(code, "meta"));
      p.get<DeckBook>(k(code, "book"));
      for (const part of HASHES) p.hgetall(k(code, part));
      const [meta, book, members, votes] = (await p.exec()) as [RoomMeta | null, DeckBook | null, Record<string, Member> | null, Record<string, Vote> | null];
      if (!meta) return null;
      const ballots: Record<string, Ballot> = {};
      for (const [field, vote] of Object.entries(votes ?? {})) {
        const [memberId, key] = field.split("|");
        if (memberId && key) (ballots[memberId] ??= {})[key] = vote;
      }
      return { ...meta, members: Object.values(members ?? {}), ballots, book: book ?? { deck: [], pool: [], page: 0, exhausted: true } } satisfies Room;
    },
    async upsertMember(code, member) {
      await redis.hset(k(code, "members"), { [member.id]: member });
      await touch(code);
    },
    async removeMember(code, id) {
      await redis.hdel(k(code, "members"), id);
    },
    async setVote(code, id, key, vote) {
      if (vote) await redis.hset(k(code, "votes"), { [`${id}|${key}`]: vote });
      else await redis.hdel(k(code, "votes"), `${id}|${key}`);
    },
    async extendDeck(code, fromLength, book) {
      const won = await redis.set(k(code, `ext:${fromLength}`), 1, { nx: true, px: ROOM_TTL_MS });
      if (won !== "OK") return false;
      await redis.set(k(code, "book"), book, { px: ROOM_TTL_MS });
      return true;
    },
  };
}
