# v2 progress

- [x] 0. Audit & safety
- [x] 1. Monorepo skeleton
- [x] 2. packages/core
- [x] 3. apps/web
- [x] 4. apps/match
- [x] 5. Microfrontends
- [ ] 6. apps/mobile
- [ ] 7. E2E
- [ ] 8. Deploy
- [ ] 9. Docs

## Decisions

- Phase 0: `.env` untracked with `git rm --cached`; the file stays on disk but is not read by v2 (v2 reads `TMDB_READ_TOKEN`). The old keys remain in git history, so rotation is in HUMAN_TODO.md.
- Phase 0: the token supplied in `.env.local` is a 32-char v3 API key, not a v4 JWT. The server client sends `Authorization: Bearer` for JWTs and `?api_key=` otherwise. Still server-side only.
- Phase 1: TypeScript pinned to 6.0.3, not 7.0.2 (latest): typescript-eslint 8.71 requires `<6.1`.
- Phase 1: ESLint pinned to 9.39.5, not 10: eslint-config-next 16.4's react/import/a11y plugins cap at ESLint 9.
- Phase 1: pnpm `nodeLinker: hoisted` so Metro (Expo) and Next resolve the same tree.
- Phase 1: added `packages/ui` (web-only React: shell, footer, styles) shared by both Next apps so web and match never copy-paste.
- Phase 1: workspace package names match Vercel project names (`whattowatch-web`, `whattowatch-match`) so `microfrontends.json` needs no `packageName`.
- Phase 2: votes and links key on TMDB ids (`m603`, `t1396`), not deck positions, so popularity drift between two people's swipes can't break a link-mode match.
- Phase 2: "seen it" = not a like. A title can only match if every current member liked it, so anyone marking it seen takes it out of the running for that room.
- Phase 2: a room of one never matches; a match needs at least two present members.
- Phase 2: presence = polled within the last 15s (poll is 2s). The match rule uses present members, so someone who closes the tab stops blocking after 15s.
- Phase 2: link codec is a versioned binary format (varint, delta-encoded ids), base64url. Holds up to 8 voters so a link can go round a group. 120 likes is under 300 chars.
- Phase 2: genres are app-level slugs mapped to TMDB movie/TV ids; genres with no TV equivalent (horror, thriller, romance) drop TV from the deck instead of silently ignoring the filter.
- Phase 2: era has a third value, "any" (default), besides new/classics: fewer dead decks.
- Phase 3: one TMDB proxy implementation (`handleTmdbApi` in `@wtw/ui/server`, guarded by `server-only`), mounted by web at `/api/tmdb/*` and by match at `/match/api/tmdb/*`. Mobile uses the same endpoints.
- Phase 3: posters use plain `<img>` against TMDB's pre-sized CDN images instead of `next/image`, to stay off the Hobby image-optimization quota.
- Phase 3: Tailwind 4 theme reads CSS variables generated from `@wtw/tokens` (`tokensCss()`), the same source the mobile StyleSheet uses.
- Phase 3: region = `?region=` > `wtw_region` cookie > `x-vercel-ip-country` > Accept-Language > US. Language = `wtw_lang` cookie > Accept-Language.
- Phase 4: room API is POST-only (`/match/api/rooms`, `/match/api/rooms/:code/{sync,vote,leave}`) with the anonymous viewer in the body. `sync` doubles as heartbeat and as the place matches get recorded, so any member's poll settles a match.
- Phase 4: Redis layout is four keys per room (meta string + members/votes/matches hashes), all expiring at createdAt+12h. Matches use HSETNX: two simultaneous last likes record one match.
- Phase 4: store selection = Upstash/KV env > memory (only when NODE_ENV != production or ROOM_STORE=memory) > none. With none, `/match/new` hides live mode and says to use link mode.
- Phase 4: link mode identifies voters by name, so when B sends a link back to A, A's earlier entry is replaced, not duplicated. Progress is kept in sessionStorage per seed, and sharing rewrites the URL, so back and reload keep your picks.
- Phase 4: setup hides resold "channel" providers (Amazon Channel, Apple TV channel) and shows at most 18 services.
- Phase 4: room, setup and link screens render client-only (`next/dynamic`, `ssr: false`) because their first render depends on the localStorage viewer.
- Phase 5: projects `whattowatch-web` (root `apps/web`) and `whattowatch-match` (root `apps/match`) created via `vercel api`; group `whattowatch` created with `vercel mf create-group --non-interactive` (free tier, first 2 projects included; Vercel lists $2 per million routed requests). Local proxy verified on :3024 routing `/` to web and `/match/*` to match.
- Phase 5: Upstash via `vercel integration add upstash/upstash-kv` stopped with `userActionRequired` (terms acceptance in browser). Logged in HUMAN_TODO.md; production live mode falls back to link mode.
- Phase 8 (early, so mobile and e2e have a real API): `whattowatch.vercel.app` refused with `Cannot add whattowatch.vercel.app since it's already assigned to another project. (409)`. It isn't in this account's project or alias lists, so it belongs to someone else. Production is `https://whattowatchxinny.vercel.app`, attached as a project domain on `whattowatch-web`.
