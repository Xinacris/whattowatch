# v2 report

## URLs

- Production: https://whattowatchxinny.vercel.app (default app `whattowatch-web`, with `/match/*` routed to `whattowatch-match` by the microfrontends group `whattowatch`)
- Health: https://whattowatchxinny.vercel.app/api/health returns `{"ok":true,"version":"2.0.0","tmdb":true}`
- Room store status: https://whattowatchxinny.vercel.app/match/api/status (`live:false` until Upstash is connected)
- Branch: `v2` (not merged to `main`)

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

- **Live rooms are off in production** until Upstash is connected (terms acceptance needed; see HUMAN_TODO.md). The setup screen says so and offers link mode, which works.
- **Universal links** (https share link opening the app) need AASA/assetlinks files with your Apple Team ID and Android signing fingerprint. The custom scheme works now.
- **Mobile was verified by doctor + bundle export, not on a device or simulator.** No EAS build was made (needs your account).
- **The old TMDB keys are still in git history** on `main`. Rotate them (HUMAN_TODO.md).
- E2E covers desktop Chromium only. React components have no unit tests; the logic they call is tested in core.
- Unknown title ids render the "wrong shelf" page with HTTP 200, because Next streams metadata before `notFound()` resolves.
- Vercel lists a $2 per million microfrontends-routed requests fee on the group (the first two projects are free).
