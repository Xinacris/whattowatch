# WhatToWatch v2 — Claude Code prompt (PRISM KERNEL)

> Paste everything below the line into Claude Code, run from the root of a fresh clone of `Xinacris/whattowatch`.

---

You are working on my repo `Xinacris/whattowatch`. Read this whole brief before touching anything. It is long on purpose; the run is long and autonomous.

**Step 0 of everything:** save this brief verbatim to `docs/V2_PROMPT.md` and commit it on a new branch `v2`. Re-read that file whenever your context gets compacted. Track progress in `docs/PROGRESS.md` (checkbox per phase, one line per decision).

## P — Purpose

Turn WhatToWatch from a generic "search movies, see where to stream" app into a **swipe-to-decide app for two or more people who can't agree on what to watch**. The moment we capture: a couple on the couch, or friends on a call, 40 minutes into scrolling Netflix with nothing picked. Everyone swipes the same deck; the first title everyone liked is the pick. Tinder mechanics, movie-night purpose.

Three deliverables:
1. **Web** (deployed on Vercel), split into two Vercel microfrontends.
2. **Mobile app** (Expo / React Native) that does the same swipe flow against the deployed web API.
3. **A less "AI-generated" product** — design and copy that look like a person with taste made them.

No login, no accounts. Login comes later; leave a clean seam for it, don't build it.

## Current state (verified, don't re-discover)

- Create React App (`react-scripts` 5), React 19, react-router-dom 7, axios, Tailwind 3 mixed with SCSS and CSS Modules.
- Pages: `Home`, `SearchResults`, `TitleDetail`, `PersonDetail`, `CollectionDetail`. Components: `Layout`, `SearchContainer` (288 lines), `MovieCard`, `SkeletonCard`, `ThemeToggle`, `LocaleToggle`.
- `src/services/tmdbApi.js` (~560 lines) calls TMDB **directly from the browser** using `REACT_APP_TMDB_API_KEY` / `REACT_APP_TMDB_API_TOKEN`, so the secret ships in the bundle.
- `.env` with real TMDB credentials **is committed to the public repo**.
- i18n via `LocaleContext` + `src/locales/{en,tr}.json`. Country detection in `utils/countryDetection.js`. Dark/light via `ThemeContext`.
- Branding is "Xinny's WhereToWatch"; README is emoji-heavy, generic, and inaccurate (mentions Watchmode, "Vite / CRA", features that don't exist).
- Visual tells of AI output: indigo→blue gradient accent bars, generic section headers, skeleton grids of identical cards.

## R — Rules

### Hard rules
- **Secrets:** `git rm --cached .env` in Phase 0, add `.env.example`. TMDB is only called **server-side** (Next.js route handlers) using `TMDB_READ_TOKEN`. No TMDB credential in any client bundle, web or mobile. Never print the token in output. If no token is available in env, stop and ask me for it — don't use the one from git history.
- **No auth.** Identity = anonymous device id (UUID in localStorage / SecureStore) + a display name the user types. Put it behind a `getViewer()` function so login can replace it later.
- **Microfrontends:** install and follow the Vercel skill: `npx skills add vercel/microfrontends`. Use exactly two projects (Hobby includes two): `whattowatch-web` (default app) and `whattowatch-match`. If setup is blocked by a plan/platform error, not by your own bug, fall back to a single Next.js app with `/match` routes, record the exact error in `docs/PROGRESS.md`, and continue.
- **Domain:** production must be `whattowatch.vercel.app`. If that subdomain is taken by someone else, use `whattowatchxinny.vercel.app`. Check by actually trying the alias, not by guessing.
- **Versions:** use current stable versions of everything (Next.js, Expo SDK, Tailwind, etc.). Check with `npm view <pkg> version`; don't trust memory.
- Don't merge to `main`. Work on `v2`, push it, deploy production from it with the Vercel CLI.
- Commit after every working step with Conventional Commit messages.

### Design rules — "not AI"
Banned, anywhere in UI, README or copy:
- Purple/indigo/blue gradients, gradient text, glassmorphism, glowing blobs, animated mesh backgrounds.
- Emoji in headings, buttons, README sections or UI copy. Sparkle icons.
- Phrases like "Discover your next favorite", "Seamless", "Elevate", "Unleash", "Dive into", "Powered by", "Your ultimate", "Perfect for".
- Hero → 3 feature cards → CTA layout. Centered-everything landing pages.
- Uniform rounded-2xl cards with identical shadows everywhere.

Direction (commit to it, don't hedge): **late-night video store.** Think a rental shelf at 1 a.m.
- Dark warm base (near-black brown, not pure #000 and not slate-blue), one loud accent (hot yellow or tape-label orange), posters do the colour work.
- Type: one condensed, heavy display face for titles; a monospace for labels, metadata and buttons (like a VHS spine sticker). Load from Google Fonts / `next/font`.
- Small physical details: subtle film grain, slightly rotated "staff pick" stickers, runtime written like a tape label (`1H 52M`), hard 2px borders instead of soft shadows.
- Copy voice: dry, short, human, a bit funny. TR and EN both written natively, not translated word-for-word. Example: TR "Kanepe. İki kişi. 40 dakikadır kaydırıyorsunuz. Bitirelim şunu." / EN "Couch. Two people. Forty minutes of scrolling. Let's end this."
- Light theme optional; dark is the identity. Keep TR/EN toggle.
- Motion: physical, not floaty. Card follows the finger, rotates with drag, snaps back with a spring, flies off on commit.

## I — Interface (what the user sees)

### Web, default app (`whattowatch-web`)
- `/` — landing that sells the couch moment in one screen: headline, one big "Start a movie night" button, a "Join with code" input, and a strip of real trending posters. No feature grid.
- `/search`, `/title/[type]/[id]`, `/person/[id]`, `/collection/[id]` — port the existing pages to Next.js + TS, restyled. Keep "where to watch in my country" (TMDB watch providers, region auto-detected, overridable).
- `/api/tmdb/*` — thin, typed, cached server proxy. `/api/health` returns `{ ok: true, version }`.
- TMDB attribution in the footer (logo + "This product uses the TMDB API but is not endorsed or certified by TMDB.").

### Web, match app (`whattowatch-match`, served under `/match`)
- `/match/new` — set up a night: movie / series / both, streaming services they actually have (fetch providers for the region from TMDB, show logos, multi-select), up to 3 genres or "anything", max runtime, "something new" vs "classics" toggle. Display name. Creates a room with a 6-character code (no ambiguous chars: no 0/O/1/I) and a share link.
- `/match/[code]` — lobby (who's here) → swipe deck → match screen.
- Swipe: drag right = like, left = nope, up = "seen it" (excluded, not a vote). Buttons as well as gestures; keyboard ←/→/↑ on desktop. Undo last swipe once.
- Card: poster, title, year, runtime, TMDB rating, 2 genres, provider logos for the room's services. Tap to flip for overview and cast.
- **Match rule:** a title is a match when every member currently in the room liked it. Show the match screen to everyone ("Bu akşam bu."), with where-to-watch links. Allow "keep going" to collect more matches; room ends with a shortlist ranked by when they matched.
- Two modes, both required:
  1. **Link mode (zero backend state):** deck is deterministic from a seed in the URL (filters + seed). Person A swipes, gets a link that encodes their likes (compressed, URL-safe). Person B opens it, swipes the same deck, matches computed client-side. Works with no database at all.
  2. **Live mode:** shared room state through a `RoomStore` interface with two implementations: Upstash Redis (used when `UPSTASH_REDIS_REST_URL`/`KV_REST_API_URL` env exists) and in-memory (dev/tests only). Clients poll every ~2s (no websockets — serverless). Rooms expire after 12h. If no Redis env exists in production, live mode shows a clear "use link mode" fallback instead of breaking. Try provisioning Upstash via the Vercel Marketplace from the CLI; if it requires an interactive terms acceptance, put it in `HUMAN_TODO.md` with exact steps and move on.

### Mobile (`apps/mobile`, Expo Router, TypeScript)
- Same flow: home (start / join with code), setup, lobby, deck, match, shortlist. Link mode + live mode.
- Gestures with `react-native-gesture-handler` + `react-native-reanimated`; haptic on commit (`expo-haptics`).
- Calls the deployed web API via `EXPO_PUBLIC_API_URL`. No TMDB key in the app.
- Deep links: `whattowatch://match/<code>` and the https share link both open the room.
- Same visual identity (port the tokens, don't import web CSS).
- Out of scope: store submission and EAS builds (they need my account). Write the exact steps in `HUMAN_TODO.md`.

## S — Structure

Convert to a **pnpm + Turborepo monorepo**:

```
apps/
  web/        Next.js App Router, TS — default microfrontend (owns microfrontends.json)
  match/      Next.js App Router, TS — child microfrontend, routes under /match
  mobile/     Expo Router app
packages/
  core/       shared TS, no React: TMDB types + mappers, deck builder, seeded shuffle,
              match logic, link-mode encode/decode, room types, i18n strings (tr/en)
  tokens/     design tokens (colours, type scale, spacing, radii) as TS → consumed by
              Tailwind (web) and StyleSheet (mobile)
  config/     shared tsconfig, eslint
docs/         V2_PROMPT.md, PROGRESS.md
REPORT.md     what was built, URLs, decisions, known gaps
HUMAN_TODO.md things only I can do (key rotation, Upstash, EAS, store accounts)
```

Logic lives in `packages/core` and is unit-tested there (Vitest). Apps stay thin.

## M — Motion (order of work)

Work phase by phase. Finish, verify, commit, tick the phase in `docs/PROGRESS.md`, then move on. Don't ask me questions between phases unless you're truly blocked (missing secret, account action). When blocked on one thing, log it to `HUMAN_TODO.md` and continue with everything else.

0. **Audit & safety** — branch `v2`, save this brief, untrack `.env`, add `.env.example`, check tools (`node`, `pnpm`, `vercel whoami`, `gh auth status`). Print a short plan. **Then stop and wait for my next message** (I'll start the long run with `/goal`).
1. **Monorepo skeleton** — Turborepo + pnpm workspaces, shared config, empty apps build green.
2. **`packages/core`** — port `tmdbApi.js` to typed functions, deck builder (TMDB discover with room filters, de-dupe, seeded shuffle, page-ahead), match logic, link-mode codec. Vitest coverage on deck, shuffle determinism, match rule, codec round-trip, edge cases below.
3. **`apps/web`** — port existing pages to Next.js, server-side TMDB proxy with caching, new design system, new landing, TR/EN.
4. **`apps/match`** — setup, lobby, deck, match, shortlist; link mode then live mode with `RoomStore`.
5. **Microfrontends** — wire with the Vercel skill, local proxy dev working, `vercel microfrontends inspect-group` shows both projects.
6. **`apps/mobile`** — Expo app as specified; `expo-doctor` clean; bundles export for iOS and Android.
7. **E2E** — Playwright: (a) link mode: context A swipes and shares, context B opens link, swipes, both reach the same match; (b) live mode with in-memory store locally: two contexts in one room, both like the same title, both see the match screen. Run (a) against production too.
8. **Deploy** — production deploy of both projects, alias to the domain per the rule above, set env vars on Vercel (never echo values), smoke test with curl.
9. **Docs** — rewrite README in the new voice (no emoji, accurate, short, with a real screenshot taken by Playwright), write `REPORT.md` and `HUMAN_TODO.md`, push `v2`.

## KERNEL CHECK (run this on yourself before declaring any phase done)

- **K — Key output:** does the phase produce the thing in its line above, and did you *show* the proof (command + exit code + relevant output)?
- **E — Edge cases:** deck runs out (fetch next page; if TMDB has nothing left, say so and offer to loosen filters); zero providers selected; member leaves mid-deck (match rule uses current members); late joiner (gets the same seeded deck from the start); two people tap the last like at the same moment (match recorded once); room code typo / expired room; TMDB 429/5xx (retry with backoff, friendly error); title with no poster (designed fallback, not a broken image); region with no provider data; very long titles; TR characters in names.
- **R — Reusable:** logic in `packages/core`, tokens in `packages/tokens`; web and mobile import, never copy-paste.
- **N — Nested logic avoided:** early returns, small pure functions, no component over ~200 lines, no prop drilling deeper than 2 (use a small store).
- **E — Error states:** every fetch has loading / empty / error UI written in the brand voice; no raw error strings or stack traces shown to users.
- **L — Least surprise:** swipe right always means yes; undo is obvious; share link does what it says; back button never loses a room; nothing auto-plays sound.

Start with Phase 0 now.
