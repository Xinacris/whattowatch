# Things only you can do

## 1. Rotate the leaked TMDB credentials
The old `.env` with `REACT_APP_TMDB_API_KEY` / `REACT_APP_TMDB_API_TOKEN` was public on `main`, and it stays in git history even though v2 untracks it.
1. https://www.themoviedb.org/settings/api, regenerate the API key and the read access token.
2. Update Vercel (no echo): `printf %s "$NEW" | vercel env add TMDB_READ_TOKEN production --cwd apps/web --force`, then the same for `preview`, and again with `--cwd apps/match`.
3. Redeploy both projects (see REPORT.md, Deploy).
4. Optional: scrub history with `git filter-repo --path .env --invert-paths` and force-push `main`. Only after rotating; scrubbing doesn't un-leak a key.

## 2. Turn on live rooms (Upstash Redis)
The CLI stopped at a terms screen:
1. Open https://vercel.com/xinacris-projects/~/integrations/accept-terms/upstash?source=cli and accept.
2. `cd apps/match && vercel integration add upstash/upstash-kv --name wtw-rooms`
3. Check that `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`) exist on `whattowatch-match`: `vercel env ls --cwd apps/match`.
4. Redeploy `whattowatch-match`. `/match/api/status` should then say `"live": true, "store": "redis"`.
Until then, production live mode shows "use link mode", which works with no database.
