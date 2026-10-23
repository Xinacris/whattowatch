import { castVote, itemKey, normalizeRoomCode, parseItemKey, syncRoom, type Vote } from "@wtw/core";
import { deal } from "@/lib/deal";
import { getRoomStore } from "@/lib/store";
import { badRequest, body, liveOff, roomNow, noStore, parseViewer, reply } from "@/lib/http";

// "seen" is the pre-v2.7 up-swipe (a skip): a tab still open from before may send it once more.
const VOTES: (Vote | null)[] = ["like", "nope", "rewatch", "seen", null];

export async function POST(req: Request, ctx: RouteContext<"/match/api/rooms/[code]/[action]">) {
  const store = getRoomStore();
  if (!store) return liveOff();
  const { code: raw, action } = await ctx.params;
  const code = normalizeRoomCode(raw);
  if (!code) return reply({ ok: false, reason: "bad_code" });
  const b = await body(req);
  const viewer = parseViewer(b?.viewer);
  if (!viewer) return badRequest();
  const now = roomNow(req, store);
  if (action === "sync") return reply(await syncRoom(store, code, viewer, now, deal));
  if (action === "leave") {
    await store.removeMember(code, viewer.id);
    return Response.json({ ok: true }, { headers: noStore });
  }
  if (action !== "vote") return badRequest();
  const parsed = typeof b?.key === "string" ? parseItemKey(b.key) : null;
  const vote = (b?.vote ?? null) as Vote | null;
  if (!parsed || !VOTES.includes(vote)) return badRequest();
  return reply(await castVote(store, code, viewer, itemKey(parsed.kind, parsed.id), vote, now, deal));
}
