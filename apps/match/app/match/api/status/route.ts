import { getRoomStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  const store = getRoomStore();
  return Response.json({ ok: true, live: Boolean(store), store: store?.kind ?? null }, { headers: { "cache-control": "no-store" } });
}
