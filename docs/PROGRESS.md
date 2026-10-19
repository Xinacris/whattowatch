# v2 progress

- [x] 0. Audit & safety
- [x] 1. Monorepo skeleton
- [x] 2. packages/core
- [x] 3. apps/web
- [x] 4. apps/match
- [x] 5. Microfrontends
- [x] 6. apps/mobile
- [x] 7. E2E
- [x] 8. Deploy
- [x] 9. Docs

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
- Phase 6: Expo SDK 58 (RN 0.88, Reanimated 4.7, Gesture Handler 3.3 hook API), scaffolded with create-expo-app 5. Gestures use `usePanGesture`/`useTapGesture`/`useExclusiveGestures`, with physics constants from `@wtw/tokens` `motion`, the same ones the web card uses.
- Phase 6: the API client (`createWtwApi`) and deck session (`createDeckSession`, a tiny observable) moved into `@wtw/core`. Web and mobile wrap them with `useSyncExternalStore`; zustand dropped.
- Phase 6: React pinned to 19.3.0 everywhere (Expo SDK 58's version) so the hoisted tree has one React.
- Phase 6: pnpm 12's default `minimumReleaseAge` rejected `expo-modules-cli@0.3.1` (published the same day, required by `expo@58.0.16` as `~0.3.1`). Added that exact version to `minimumReleaseAgeExclude`, next to the SDK 58 exact versions already listed.
- Phase 6: deep links: scheme `whattowatch://match/<code>`; Android intent filter and iOS associated domain for `https://whattowatchxinny.vercel.app/match/*`. Universal-link verification files (AASA, assetlinks) need the store team id and signing cert, so they're in HUMAN_TODO.md.
- Phase 6: mobile `build` task = `expo export` for iOS + Android, so `turbo run build` proves the bundles.
- Phase 7: Playwright starts web, match (`ROOM_STORE=memory`) and the microfrontends proxy itself, or targets `E2E_BASE_URL`. Live-mode spec skips when remote. Found and fixed: link share now rewrites the URL before touching the clipboard, which can hang in headless and denied-permission browsers.
- Phase 8: both projects deployed to production with `vercel deploy --prod` from the repo root (`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` per project, so the build sees the whole workspace). `TMDB_READ_TOKEN` set for production and preview via stdin; `ENABLE_EXPERIMENTAL_COREPACK=1` so Vercel uses pnpm 12. `.vercelignore` keeps every `.env*` out of uploads.
- Phase 9: README rewritten (no emoji, real Playwright screenshots of production in `docs/`), REPORT.md and HUMAN_TODO.md written. Ratings show as `7.9/10` rather than a star glyph.

# v2.1

Brief: `docs/V2_1_PROMPT.md`.

Plan: core first (rounds, results, codec v2 with v1 decode, search params, room deck rounds), then link mode, live mode, mobile, web search, landing, e2e, deploy, merge.

- [x] 1. Read brief and current code, plan
- [x] 2. Core: rounds, results, codec v2 + v1, search, room rounds (tests)
- [x] 3. Match link mode: rounds, share screen, friend deck, results
- [x] 4. Match live mode: room rounds, waiting, results
- [x] 5. Mobile on the same core flow
- [x] 6. Web search: suggest, search box, filters, browse, logos, load more
- [x] 7. Landing: search hero and browse rows
- [x] 8. Playwright (a)–(f)
- [x] 9. Full checks, deploy, docs, push
- [x] 10. Fast-forward main

## v2.1 decisions
- Core: `roundState` is derived from votes alone, never stored. Votes land in deck order (you always swipe the top card), so likes at each checkpoint are a prefix count, and undoing the 10th vote returns to round one by construction.
- Core: when TMDB runs out before a round fills, the round is whatever exists and the rule uses it (`reason: "end"`). Seen-it on everything ends at the shelf's end, and the deck session also stops after 40 pages.
- Codec v2: version byte 2, a results flag, filters, seed, the deck as zigzag delta varints in order (max 60), then per voter a name and 2 bits per card (yes/no/seen). 30 cards and 3 voters: 227 chars. v1 tokens still decode as `version: 1` with an empty deck.
- Link roles: `linkStage(payload, votedHere)`. "Voted here" is a per-browser marker keyed by seed, so the initiator opening their own link sees "waiting for your friend". Voters are not identified by name any more; duplicate names are shown as "Ali (2)".
- Live rooms: the server deals the deck from the same seeded discover pages (keys only, in a Redis `book` key); clients load cards by key through a new `cards` proxy route. Extensions are gated by `SET NX wtw:room:<code>:ext:<length>`. "Seen it" counts as done for "everyone has voted every card"; the 30% check uses yes/(yes+no).
- Live results and "waiting for" use present members (polled in the last 15s), like the old match rule.
- Removed: `MatchOverlay`, the running shortlist, `linkMatches`, room `matches`/`addMatches` (replaced by `matchesFromVoters` and room `results`, shown only when the room is done).
- Search: the shared search box and header live in `packages/ui` rather than `apps/web`, because the header renders in both zones. Its suggestion and result links are full navigations for the same reason.
- Search: browse mode applies every filter through TMDB discover; search mode filters TMDB search results by type/year/rating/genre/language, and runtime/services via each title's details (same cached call as deck cards). "Any service" = discover `with_watch_monetization_types=flatrate` in the region.
- Search: services are stored in the `wtw_services` cookie next to `wtw_region`/`wtw_lang`, and passed through the existing prefs provider.
- Search: provider logos for the first 20 results come with the page; the rest load in one request to `/api/tmdb/cards`.
- Production: `whattowatch-match` had KV env vars but was deployed before they existed; the v2.1 redeploy turned `/match/api/status` to `live: true, store: redis`.
- E2E: the live spec runs against a deployed Redis store with `E2E_LIVE=1`. (f) passes against production.
- Both Vercel projects are not Git-connected: deploys are CLI-only (noted in REPORT.md). GitHub's default branch was already `main`.
- Fixed while taking screenshots: the landing grid overflowed at 375px (implicit auto column); now `grid-cols-1` on phones.
