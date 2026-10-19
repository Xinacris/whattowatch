import { describe, expect, it, vi } from "vitest";
import { createTmdbClient, isReadToken, TmdbError, toDeckCard, toSummary } from "../src";

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const fail = (status: number, headers: Record<string, string> = {}) => new Response("{}", { status, headers });

describe("tmdb client", () => {
  it("retries 429 and 5xx with backoff, then succeeds", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(fail(429, { "retry-after": "1" })).mockResolvedValueOnce(fail(503)).mockResolvedValueOnce(ok({ fine: true }));
    const sleeps: number[] = [];
    const c = createTmdbClient({ credential: "k", fetch, sleep: async (ms) => { sleeps.push(ms); } });
    expect(await c.get("/x")).toEqual({ fine: true });
    expect(sleeps).toEqual([1000, 600]);
  });
  it("gives up after the retry budget and does not retry 404", async () => {
    const sleep = async () => {};
    const always = vi.fn().mockImplementation(async () => fail(500));
    await expect(createTmdbClient({ credential: "k", fetch: always, sleep, retries: 2 }).get("/x")).rejects.toBeInstanceOf(TmdbError);
    expect(always).toHaveBeenCalledTimes(3);
    const notFound = vi.fn().mockImplementation(async () => fail(404));
    await expect(createTmdbClient({ credential: "k", fetch: notFound, sleep }).get("/x")).rejects.toMatchObject({ status: 404, transient: false });
    expect(notFound).toHaveBeenCalledTimes(1);
  });
  it("retries network errors", async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(ok(1));
    expect(await createTmdbClient({ credential: "k", fetch, sleep: async () => {} }).get("/x")).toBe(1);
  });
  it("uses Bearer for v4 tokens and api_key for v3 keys", async () => {
    const fetch = vi.fn().mockImplementation(async () => ok({}));
    await createTmdbClient({ credential: "eyJa.b.c", fetch }).get("/m", { q: "a" });
    expect(fetch.mock.calls[0]?.[0]).not.toContain("api_key");
    expect(fetch.mock.calls[0]?.[1].headers.authorization).toBe("Bearer eyJa.b.c");
    await createTmdbClient({ credential: "abc123", fetch }).get("/m");
    expect(fetch.mock.calls[1]?.[0]).toContain("api_key=abc123");
    expect(fetch.mock.calls[1]?.[1].headers.authorization).toBeUndefined();
    expect(isReadToken("abc")).toBe(false);
  });
});

describe("mappers", () => {
  it("no poster stays null so the UI can draw its own cover", () => {
    expect(toSummary({ id: 1, title: "X", poster_path: null })?.poster).toBeNull();
  });
  it("keeps long and Turkish titles intact, falls back on empty", () => {
    const long = "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb";
    expect(toSummary({ id: 1, title: long })?.title).toBe(long);
    expect(toSummary({ id: 2, name: "Şahsiyet", first_air_date: "2018-04-03" })?.title).toBe("Şahsiyet");
    expect(toSummary({ id: 3, title: "  " })?.title).toBe("Untitled");
  });
  it("a region with no provider data gives an empty list, not a crash", () => {
    const card = toDeckCard({ id: 1, title: "X", "watch/providers": { results: { US: {} } } }, "movie", "TR");
    expect(card.providers).toEqual([]);
  });
});
