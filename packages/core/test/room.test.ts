import { describe, expect, it } from "vitest";
import { castVote, createMemoryStore, PRESENCE_MS, ROOM_TTL_MS, sanitizeFilters, syncRoom, type RoomStore } from "../src";

const A = { id: "a", name: "Ayşe" };
const B = { id: "b", name: "Burak" };
const C = { id: "c", name: "Cem" };

async function room(store: RoomStore = createMemoryStore(), now = 0) {
  await store.create({ code: "ABC234", filters: sanitizeFilters({}), seed: "seed", createdAt: now, hostId: "a" });
  return store;
}

describe("live rooms", () => {
  it("matches when everyone present likes it, and shows it to both", async () => {
    const s = await room();
    await syncRoom(s, "ABC234", A, 1);
    await syncRoom(s, "ABC234", B, 1);
    await castVote(s, "ABC234", A, "m1", "like", 2);
    const r = await castVote(s, "ABC234", B, "m1", "like", 3);
    expect(r.ok && r.value.matches).toEqual([{ key: "m1", at: 3 }]);
    const a = await syncRoom(s, "ABC234", A, 4);
    expect(a.ok && a.value.matches.map((m) => m.key)).toEqual(["m1"]);
  });
  it("two people landing the last like together record one match", async () => {
    const s = await room();
    await syncRoom(s, "ABC234", A, 1);
    await syncRoom(s, "ABC234", B, 1);
    await s.setVote("ABC234", "a", "m1", "like");
    await s.setVote("ABC234", "b", "m1", "like");
    await Promise.all([syncRoom(s, "ABC234", A, 5), syncRoom(s, "ABC234", B, 5)]);
    expect((await s.get("ABC234"))?.matches).toHaveLength(1);
  });
  it("someone leaving mid-deck stops blocking the rest", async () => {
    const s = await room();
    for (const v of [A, B, C]) await syncRoom(s, "ABC234", v, 0);
    await castVote(s, "ABC234", A, "m1", "like", 1);
    const before = await castVote(s, "ABC234", B, "m1", "like", 2);
    expect(before.ok && before.value.matches).toEqual([]);
    const later = PRESENCE_MS + 10;
    await syncRoom(s, "ABC234", A, later);
    const after = await syncRoom(s, "ABC234", B, later);
    expect(after.ok && after.value.members.map((m) => m.id)).toEqual(["a", "b"]);
    expect(after.ok && after.value.matches.map((m) => m.key)).toEqual(["m1"]);
  });
  it("undo removes a vote and only your own ballot is returned", async () => {
    const s = await room();
    await syncRoom(s, "ABC234", B, 0);
    await castVote(s, "ABC234", A, "m1", "like", 0);
    const undone = await castVote(s, "ABC234", A, "m1", null, 1);
    expect(undone.ok && undone.value.mine).toEqual({});
    await castVote(s, "ABC234", B, "m2", "nope", 1);
    const a = await syncRoom(s, "ABC234", A, 1);
    expect(a.ok && a.value.mine).toEqual({});
  });
  it("late joiner gets the same seed and filters", async () => {
    const s = await room();
    await syncRoom(s, "ABC234", A, 0);
    const late = await syncRoom(s, "ABC234", C, 60_000);
    expect(late.ok && late.value.seed).toBe("seed");
  });
  it("typo, missing and expired rooms say why", async () => {
    const s = await room();
    expect(await syncRoom(s, "ABC23", A, 0)).toEqual({ ok: false, reason: "bad_code" });
    expect(await syncRoom(s, "ZZZ999", A, 0)).toEqual({ ok: false, reason: "not_found" });
    expect(await syncRoom(s, "ABC234", A, ROOM_TTL_MS + 1)).toEqual({ ok: false, reason: "expired" });
  });
});
