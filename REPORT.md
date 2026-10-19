# v2.1 report

Brief: `docs/V2_1_PROMPT.md`. Search became the front door; movie night became rounds with a results screen.

## What changed

- **Search first.** The landing hero asks "What are we watching?" over a large search box with instant suggestions; "Start a movie night" and the join box sit beside it. Under the trending shelf: four browse rows (under 100 minutes, streaming tonight or on your services, old but gold, Turkish films), each linking into `/search` with the filters set.
- **Suggestions.** `/api/suggest?q=` (cached a day at the edge) returns up to 8 items, at most 2 people. The box is an ARIA combobox: 250 ms debounce after 2 characters, ↑/↓ cycle, Enter opens the highlighted item or searches, Esc closes. A failed suggest call just shows no dropdown; Enter still submits the plain GET form. The same box is in the header on every page (an icon button on phones).
- **`/search`.** Browse mode with no query (TMDB discover), search mode with one (TMDB search, then the filters). Type, genres, year range (swapped if reversed), max runtime, min rating, Turkish only, sort, and where: anywhere / any service / only my services (picks remembered in the `wtw_services` cookie). Everything is in the URL. Logos for the first 20 results come with the page, the rest load in one request. "Load more" button. Empty results offer one-click loosening. On phones the filters are a bottom sheet behind an "N filters" chip with "clear all". People and collections stay below the titles.
- **Rounds.** The person starting a night votes 10 cards, then 5 more at a time until `likes ≥ ceil(0.3 × voted)`, up to 30. "Seen it" doesn't count and the next card takes its place. At the cap: share anyway with at least one like, or offer a new stack. The counter always reads `LIKED 2 / NEED 3 · CARD 7 OF 10`; there is no share button mid-round.
- **Blind share, fixed friend deck, results.** The share screen shows how many yeses, not which. Link codec v2 carries the voted deck in order (zigzag delta varints) plus 2 bits per card per voter, so the friend gets exactly those cards. No pop-ups while swiping, and a results screen at the end with poster, runtime, rating and where to watch. Send results back (opens straight to results), add another person (same deck, results recompute), and for zero overlap: swap roles or loosen filters. v1 links still decode; the friend gets the first max(10, initiator's votes) cards of the seed deck.
- **Live rooms.** The server deals the deck (Redis `book` key). When every present member has voted on every card and anyone is under 30%, it deals 5 more for everyone, up to 30. The extension is gated by `SET NX` on the old deck length, so two members finishing together extend once. Everyone sees "waiting for <names>", then the same results screen. The per-card match overlay is gone from web and mobile.
- **Mobile.** Same round rule, share, friend and results flow, from the same core functions. Search is not on mobile yet.

## Proof (v2.1 run)

- `pnpm turbo run lint typecheck test build`: 22/22 tasks, exit 0. Core has 86 Vitest tests, including table-driven `roundState`, results, codec v2 + v1 decode, search params and room rounds. A 30-card, 3-voter v2 link is 227 characters.
- Playwright locally: (a) to (f) plus a chewed-up-link test, 10/10. Against production: 9 passed with the live spec skipped by default; with `E2E_LIVE=1`, (f) also passes against production Redis.
- curl against production: `/`, `/search`, `/match/new`, `/api/health`, `/api/suggest?q=matrix` all 200. `/match/api/status` returns `{"live":true,"store":"redis"}`.
- Screenshots at 375px and 1280px: `docs/screens/` (landing, search with filters open, round counter, share, results, zero-match results).

## Deploys

Both Vercel projects are not connected to Git, so pushing `main` doesn't deploy. Deploys are CLI-only: `vercel deploy --prod` from the repo root with `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` per project.

## v2.1 known gaps

- Search mode with runtime or service filters fetches details for every result on the page (cached a day), so a first uncached query with "load more" several times is slower.
- The friend's swipes in link mode are kept per tab (sessionStorage); the initiator's "I already swiped this" marker is per browser (localStorage). Two people sharing one browser can't both vote the same link.
- Live results count present members only; someone who leaves before the end isn't in the results.

---

# v2 report

## URLs

- Production: https://whattowatchxinny.vercel.app (default app `whattowatch-web`, with `/match/*` routed to `whattowatch-match` by the microfrontends group `whattowatch`)
- Health: https://whattowatchxinny.vercel.app/api/health returns `{"ok":true,"version":"2.0.0","tmdb":true}`
- Room store status: https://whattowatchxinny.vercel.app/match/api/status (`live:true`, Redis, since v2.1)
- Branch: `v2`, fast-forwarded into `main` at the end of v2.1

`whattowatch.vercel.app` was the target. Adding it returned `Cannot add whattowatch.vercel.app since it's already assigned to another project. (409)`, and it isn't in this account, so the fallback name from the brief is in use.

## What was built

- **Monorepo**: pnpm 12 workspaces + Turborepo 2.11. `apps/web`, `apps/match`, `apps/mobile`, `packages/core`, `packages/tokens`, `packages/ui`, `packages/config`.
- **packages/core**: typed TMDB client (Bearer for v4 tokens, `api_key` for v3 keys; retries 429/5xx/network with backoff and `Retry-After`), mappers, deck builder (discover with room filters, de-dupe, seeded shuffle per page, page-ahead at 5 left, runtime filter, "shelf's empty" signal), match rule, room service + in-memory store, link codec, framework-free API client and deck session, EN/TR strings. 45 Vitest tests.
- **apps/web** (Next.js 16.4, App Router): landing (headline, start button, join box, trending shelf), search with type filter, people and collections, title page with where-to-watch per region (auto-detected, overridable), person, collection, `/api/tmdb/*` proxy (allow-listed routes, CDN cache headers), `/api/health`, TMDB attribution in the footer, TR/EN toggle, friendly error and not-found pages.
- **apps/match**: `/match/new` setup (live or link, kind, services from TMDB for the region, up to 3 genres or anything, runtime cap, new/classics/any, name), `/match/[code]` lobby, deck, match screen and shortlist, `/match/link?d=` link mode, room API with Upstash and memory stores. Swipe by drag, buttons, or ←/→/↑; undo once (Backspace or button); tap to flip for plot and cast.
- **apps/mobile** (Expo SDK 58, RN 0.88): home, setup, lobby, deck, match sheet, shortlist; live and link modes; Gesture Handler 3 + Reanimated 4 swipe with spring-back and fly-off; haptics on commit; SecureStore device id; `whattowatch://match/<code>` scheme plus https intent filter and associated domain.
- **Design**: warm near-black shelf, one price-tag yellow, Anton for titles, IBM Plex Mono for labels and buttons, static film grain, tilted staff-pick stickers, tape-label runtimes (`1H 52M`), hard 2px borders. No gradients, no emoji, no feature grid.

## Proof (from the run)

- `pnpm turbo run lint typecheck test build`: 22/22 tasks, exit 0 (includes `expo export` for iOS and Android).
- `npx expo-doctor`: 20/20 checks passed. `npx expo export --platform ios` and `--platform android`: exit 0, ~4 MB Hermes bundles each.
- Playwright locally: link mode and live mode both pass. Against production: link mode passes (live mode is skipped there by design until Redis exists).
- curl against production: `/`, `/match/new`, `/api/health`, `/search?q=…`, `/title/movie/194`, `/match/api/status`, `/api/tmdb/trending` all 200.
- `vercel microfrontends inspect-group --group whattowatch` lists `whattowatch-web` (default app) and `whattowatch-match` (default route `/match/new`).
- Secrets: `git ls-files .env` is empty; the token value has 0 hits in `apps/web/.next/static`, `apps/match/.next/static`, both mobile bundles, and production HTML.

## Decisions

All of them, one line each, are in `docs/PROGRESS.md`. The ones that change behaviour:

- Votes key on TMDB ids, not deck positions, so popularity drift between two people's sessions can't break a link-mode match.
- "Seen it" from anyone currently in the room keeps that title from matching.
- A room of one never matches. Presence is a poll in the last 15s, and the match rule only counts people present, so someone who closes the app stops blocking after 15s.
- Matches are recorded with Redis `HSETNX`, so two simultaneous last likes give one match.
- TS 6.0.3 and ESLint 9.39.5 instead of the newest majors, because typescript-eslint and eslint-config-next don't support those yet.

## Known gaps

- **Universal links** (https share link opening the app) need AASA/assetlinks files with your Apple Team ID and Android signing fingerprint. The custom scheme works now.
- **Mobile was verified by doctor + bundle export, not on a device or simulator.** No EAS build was made (needs your account).
- **The old TMDB keys are still in git history** on `main`. Rotate them (HUMAN_TODO.md).
- E2E covers desktop Chromium only. React components have no unit tests; the logic they call is tested in core.
- Unknown title ids render the "wrong shelf" page with HTTP 200, because Next streams metadata before `notFound()` resolves.
- Vercel lists a $2 per million microfrontends-routed requests fee on the group (the first two projects are free).
