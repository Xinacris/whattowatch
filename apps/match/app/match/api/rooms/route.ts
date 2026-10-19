import { makeRoomCode, makeSeed, sanitizeFilters, syncRoom, type RoomFilters } from "@wtw/core";
import { getRoomStore } from "@/lib/store";
import { badRequest, body, liveOff, parseViewer, reply } from "@/lib/http";

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
    const now = Date.now();
    await store.create({ code, filters, seed: makeSeed(), createdAt: now, hostId: viewer.id });
    return reply(await syncRoom(store, code, viewer, now));
  }
  return Response.json({ error: "busy" }, { status: 503 });
}
