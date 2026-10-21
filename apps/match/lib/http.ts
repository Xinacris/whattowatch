import "server-only";
import type { RoomResult, RoomStore, Viewer } from "@wtw/core";

export const noStore = { "cache-control": "no-store" };

export function reply<T>(result: RoomResult<T>): Response {
  if (result.ok) return Response.json(result.value, { headers: noStore });
  const status = result.reason === "bad_code" ? 400 : result.reason === "full" ? 409 : result.reason === "expired" ? 410 : 404;
  return Response.json({ error: result.reason }, { status, headers: noStore });
}

export const liveOff = () => Response.json({ error: "live_unavailable" }, { status: 503, headers: noStore });
export const badRequest = () => Response.json({ error: "bad_request" }, { status: 400, headers: noStore });

/** Anonymous identity from the client. Shape-checked, nothing more: there are no accounts. */
export function parseViewer(input: unknown): Viewer | null {
  const v = input as Partial<Viewer> | null;
  if (!v || typeof v.id !== "string" || !/^[a-zA-Z0-9-]{8,64}$/.test(v.id)) return null;
  const name = typeof v.name === "string" ? v.name.trim().slice(0, 40) : "";
  return { id: v.id, name: name || "Someone" };
}

export async function body(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** The server's clock. e2e only: the memory store honours `x-wtw-skew` (ms) so a test can step past PRESENCE_MS without sleeping. */
export function roomNow(req: Request, store: RoomStore): number {
  const skew = store.kind === "memory" ? Number(req.headers.get("x-wtw-skew")) || 0 : 0;
  return Date.now() + skew;
}
