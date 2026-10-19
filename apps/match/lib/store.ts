import "server-only";
import { Redis } from "@upstash/redis";
import { createMemoryStore, type RoomStore } from "@wtw/core";
import { createRedisStore } from "./redis-store";

const globalStore = globalThis as unknown as { __wtwRooms?: RoomStore | null };

function redisEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * Redis when configured. In-memory only in dev or when ROOM_STORE=memory (e2e).
 * Otherwise null: live mode is off and the UI points people to link mode.
 */
export function getRoomStore(): RoomStore | null {
  if (globalStore.__wtwRooms !== undefined) return globalStore.__wtwRooms;
  const env = redisEnv();
  const memoryOk = process.env.NODE_ENV !== "production" || process.env.ROOM_STORE === "memory";
  globalStore.__wtwRooms = env ? createRedisStore(new Redis(env)) : memoryOk ? createMemoryStore() : null;
  return globalStore.__wtwRooms;
}
