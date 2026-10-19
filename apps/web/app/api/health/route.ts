import pkg from "../../../package.json";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, version: pkg.version, tmdb: Boolean(process.env.TMDB_READ_TOKEN) }, { headers: { "cache-control": "no-store" } });
}
