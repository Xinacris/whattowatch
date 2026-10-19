import { handleTmdbApi } from "@wtw/ui/server";

export async function GET(req: Request, ctx: RouteContext<"/api/tmdb/[...path]">) {
  const { path } = await ctx.params;
  return handleTmdbApi(req, path);
}
