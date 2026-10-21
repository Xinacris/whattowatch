import { firstBook, makeRoomCode, makeSeed, sanitizeFilters, syncRoom, type RoomFilters } from "@wtw/core";
import { deal } from "@/lib/deal";
import { getRoomStore } from "@/lib/store";
import { badRequest, body, liveOff, roomNow, parseViewer, reply } from "@/lib/http";

export async function POST(req: Request) {
  const store = getRoomStore();
  if (!store) return liveOff();
  const b = await body(req);
  const viewer = parseViewer(b?.viewer);
  if (!viewer) return badRequest();
  const filters = sanitizeFilters(b?.filters as Partial<RoomFilters>);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRoomCode();
    if (await store.get(code)) continue;
    const now = roomNow(req, store);
    const seed = makeSeed();
    const book = await firstBook(filters, seed, deal).catch(() => null);
    if (!book) return Response.json({ error: "tmdb_unavailable" }, { status: 502 });
    await store.create({ code, filters, seed, createdAt: now, hostId: viewer.id }, book);
    return reply(await syncRoom(store, code, viewer, now, deal));
  }
  return Response.json({ error: "busy" }, { status: 503 });
}
