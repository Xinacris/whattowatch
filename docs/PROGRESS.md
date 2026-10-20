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

# v2.2

Brief: `docs/V2_2_PROMPT.md`.

Plan: Git connection first so every push gets a real Vercel build; then core (item keys, collection grouping, codec v3), the cached movie-meta loader, search and the collection page, the deck and results on every surface, the copy diet, then verify and merge.

- [x] 1. Branch, brief, plan
- [x] 2. Vercel ↔ GitHub, READY preview from a push
- [x] 3. Core: item-key, collections grouping, codec v3 (tests)
- [x] 4. Cached movie-meta loader; search and deck use it
- [x] 5. Search, suggestions, collection page
- [x] 6. Deck (link, live, mobile) and results
- [x] 7. Copy diet, COPY.md, results kicker bug
- [x] 8. Verify, screenshots, merge, production READY

## Decisions
- Step 2: both projects connected with `vercel git connect` (production branch `main`). Settings set through `vercel api PATCH /v9/projects`: root `apps/web` / `apps/match`, framework nextjs, install `pnpm install`, build `pnpm turbo run build --filter=<project>`, files outside the root included, ignored build step `npx turbo-ignore`. `ENABLE_EXPERIMENTAL_COREPACK=1` added for preview too (it was production-only), so preview builds use pnpm 12.
- Step 2: the first Git builds failed with `ERR_PNPM_OUTDATED_LOCKFILE` ("the lockfile records importers["apps/mobile"], but that project's directory has no package.json"). `.vercelignore` dropped `apps/mobile`, and Git builds honour it. Removed that line; mobile sources are uploaded but never built on Vercel (the build is filtered to the project).
- Step 2: after the fix, push of `f36f291` produced Git-triggered previews `whattowatch-isdaqwsl4-…` and `whattowatch-match-keskksnd7-…`, both READY. Previews sit behind Vercel deployment protection (plain curl gets 302), so they're checked with `vercel curl --deployment <url>`, which handles the bypass: `/`, `/search?q=shrek`, `/match/new` all 200.
- Step 3: series key is `c:<id>` as the brief says; title keys keep their old form (`m603`), so every stored ballot and Redis room stays valid. `DeckCard` is shared by titles and series: a series card carries `collection` (its `CollectionSummary`), a lone part carries `partOf`. One card type means the deck, rounds and votes needed no second code path.
- Step 3: grouping is two pure steps: `groupIntoCollections` (one pass, one Map) decides where series go; `settleGroups` swaps them for loaded summaries and returns any series that failed to load, or has fewer than two released parts, to plain titles.
- Step 3: series dedupe in the deck is by series id across pages (`appendPage`) and in rooms (`DeckBook.series`). Once Shrek is in the deck as the series card or as one lone part, no later Shrek card is dealt. Rooms stored before this have no `series` and simply can't dedupe their old cards.
- Step 3: results lift a yes on a lone part to the series card when the deck has one (`matchesFromVoters(deck, voters, seriesOf)`). Only likes are lifted; "seen" Shrek 2 doesn't rule out the series.
- Step 3: codec v3 = v2 with `id * 3 + kind` (movie/tv/collection). 30 items (6 of them series) + 3 voters = 231 characters. v1 and v2 tokens still decode (a v2 writer is kept in the tests).
- Step 4: the meta loader is `createMetaLoader` in core (batching, 8 at a time, failures dropped) wrapped by `metaLoader(language, region)` in `@wtw/ui/server` (React `cache` per request). It reads the exact details URL deck cards use (`/movie/{id}?language&append_to_response=credits,watch/providers`), and `tmdb()` now revalidates `/movie|tv|collection/{id}` for 7 days, so search filters, grouping, deck cards and series all share one cached fetch per title. 429s are retried by the existing client backoff.
- Step 5: search filtering moved after grouping (TMDB search results are no longer pre-filtered), so a series is judged by all its parts. Series named by the query come first (`withNamedSeries`), ordered by where their first film came up in the title search; "shrek 2" also looks up "shrek" (`seriesQuery`), so it leads with the Shrek series and the card says "Has Shrek 2". A named series swallows its lone parts.
- Step 5: TMDB's TR names are its own ("Şrek Koleksiyonu", "Yüzüklerin Efendisi [Seri]"); we show them as given rather than rewrite them to "… Serisi".
- Step 5: unreleased parts are excluded from counts and years: Shrek shows `4 FILMS · 2001–2010` (Shrek 5, 2027, left out).
- Step 7: 22 unused keys deleted (the old match pop-up and shortlist copy, among others). Zero-match results show 2 buttons plus a "More" text link. The share and waiting screens are one component with a headline and one line, and the picky/shelf note replaces the line instead of stacking on it. A copy test checks buttons are ≤3 words in both languages and that "your turn" lives only in `link.yourTurn`. The brief's example "You start this time" is 4 words, so the button is "You go first" / "Sen başla". Table in `docs/COPY.md`.
- Step 6: link mode (initiator and friend), live rooms (server deal) and mobile all get series cards from the same `buildDeckPage`, and fixed decks load any `c:` key through the `cards` route. The friend's fixed deck now starts for any link that carries a deck (v2 or v3), not only v2. The series card front shows the poster with a `N FILMS · years` sticker, and tapping flips it to the numbered parts list (web `card-face.tsx`, mobile `series-face.tsx`). Results show "Start with: …" and link to `/collection/[id]`.
- Step 6: the search grid card shows only the film count on the poster sticker; the full `N FILMS · years · rating` sits under the name, because a full label on a 150px poster truncated. The "Has Shrek 2" note only shows when the query names that part and not the series (`namesPart`).
- Step 8 (e2e): new `e2e/series.spec.ts` (g)–(k). (i) swipes 30 cards of the fantasy deck (seed "abc", which holds the Harry Potter and Super Mario series on page 0) and checks each series appears once and none of its parts ever do. `e2e/screens.spec.ts` takes the docs screenshots when `SCREENS=1`.
- Step 8: `pnpm turbo run lint typecheck test build` exit 0 (22/22), core 135 tests. Playwright locally 15/15 (screens spec skipped). Git preview `whattowatch-4t6zpuujs-…` (8496b99) READY; `/`, `/search?q=shrek`, `/match/new` 200 via `vercel curl`, and the preview's shrek search has exactly one `data-collection="2150"`.
- Step 8: `main` fast-forwarded to `9758f49` and pushed. Git-triggered production deploys `whattowatch-5m98vk0oq-…` and `whattowatch-match-qana17iy7-…` READY from `main`. Production `/`, `/search?q=shrek`, `/match/new`, `/api/health`, `/match/api/status` all 200 (`live:true, store:redis`). Full Playwright suite against production (with `E2E_LIVE=1`): 15/15.

## v2.3

Brief: docs/V2_3_PROMPT.md. Branch `v2.3` from main at 8a48df5.

- [x] M.1 Reproduce first. Core: one Hobbit film among unrelated titles stays `122917` instead of `c121938[122917]` (failing). Playwright (l) on production with the fantasy/US/seed `hob1` deck: "The Hobbit: The Battle of the Five Armies" dealt as a title, no "The Hobbit Collection" (failing). (m) on production: 30 cards dealt 12 films whose series have 2+ released parts (Hobbit, Avatar, LOTR, Minions, Wicked, …).
- [x] M.2 Old counter diagnosed (findings below), one failing test per bug.
- [x] I.6 Round rule v2: `ROUND_FIRST 15`, `ROUND_EXTRA 5`, `LIKE_TARGET 5`, `MAX_VOTED 30` in `rounds.ts`; `LIKE_RATIO`/`likesNeeded`/`meetsRatio` deleted. One `roundState`, one `roomTape`, one `tapeText` (web, rooms, mobile). v1 links keep their 10-card size via their own constant in `link.ts`.
- [x] I.1 Grouping rule: every film with a series becomes that series in `groupIntoCollections` (still one pass, one Map); `settleGroups` keeps it when 2+ films are released, otherwise plain titles (a failed load keeps its "Part of" tag, a one-film series doesn't).
- [x] I.2 `seriesHit` + `seriesHitLabel`: "New: Zootopia 2" (latest film, out in the last 12 months) or "Inside: …"; none when the first film brought it in. Deck front (web, mobile), highlighted on the back, search card links to `/collection/[id]?part=…#part-…` with the row highlighted.
- [x] I.3 Deck: series at the first hit, deduped across pages (client `appendPage`) and rounds (room `fillBook`), one card one vote.
- [x] I.4 `seriesName`: `[Seri]` → `Serisi`, `[Animasyon-Seri]` → `Animasyon Serisi`, other brackets dropped; applied to summaries, collection pages, search, "Part of" tags. Table test.
- [x] I.5 `isThin` / `buryThin` (search) / `dropThin` (suggestions, deck); an exact title match (case, accents, ı/i) survives.
- [x] M.4 Tests green (core 167, Playwright 17 + 2 skipped live-only remote); screenshots in `.screens/` (counter 8/15 and 17/20, share on the 5th yes, Zootopia/Toy Story/Hobbit/Avatar fronts + backs at 375 and 1280, search hobbit EN/TR, search shrek). Note: search test (e) clicked "Only on my services" while the back-navigation re-render was landing (the panel remounts per URL); it now waits for network idle first.
- [x] M.5 Git Preview READY for web + match at 61f3a0c (v2.3); suite 18/18 on the preview (through the web project's automation bypass). ff-merged to main at a8cc716; Production READY for both (source git, ref main); suite 18/18 on production; curls 200. A stray `match.log` (6 lines of `next start` output) rode along in 61f3a0c; removed in a follow-up commit, `*.log` ignored.
- [ ] M.6 Cleanup branch.

### Findings: the old counter

**(a) "NEED 9" at 20 cards, round ended at 6 likes.** Two different numbers ran the tape and the round. The tape printed `need = ceil(0.3 × round size)`. The round, though, only checked likes at the checkpoints (10, 15, 20, 25, 30), and at the 30-card cap it ended with any like at all. A probe over 200k random swipe runs of the old `roundState` found "NEED 9" only on cards 26–30 of 30. That's the last round, where the cap rule sends with 1+ likes. So the tape said 9 while the share screen came up at 6. It also went wrong the other way: the tape could read `LIKED 3 / NEED 3 · CARD 4 OF 10` and keep dealing until card 10. The likes target had been reached, but nothing happened. On top of that, live rooms computed `need` a third way (`likesNeeded(max(voted, deck − seen))`, and mobile rooms `likesNeeded(deck − seen)`). Test: "the target on the tape ends the round the moment it's reached" replays every swipe and asserts `liked >= need ⇒ done` and `done by likes ⇒ liked == need`. It fails on the old code (`LLL`: still swiping).

**(b) "LIKED 0 / NEED 5 · CARD 11 OF 15" after a round with yeses.** Likes don't reset between rounds; `roundState` derives everything from the vote map. A yes on a `c:` card counts as long as that card is in the deck. The hole is that the old code only counted votes on keys that were in the *current* card list (`votedKeys(deck, votes)`). Swipes are restored from sessionStorage on reload (and on a TR/EN switch, which restarts the deck), but the cards are rebuilt from TMDB. Under v2.2 a series card existed only when 2+ parts landed on the same page and its collection loaded. So a rebuilt page could come back as separate titles (one 429 on `/collection/{id}` is enough), and every yes on `c:…` dropped out of the count. The parts came back as fresh cards, and nopes on them pushed the count to card 11 with 0 likes. Test: "yeses on series cards still count when a reload regroups the deck" (3 yeses on `c:` keys, 7 nopes, deck rebuilt as parts) expects 3 liked / 10 voted. It fails on the old code (`liked 0, voted 7`). Fix: the round counts every yes/no in the vote map, and votes whose card isn't in the list any more still go to the friend, after the listed ones.
