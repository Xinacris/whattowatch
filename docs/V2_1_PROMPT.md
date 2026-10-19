You are working on branch `v2` of Xinacris/whattowatch (pnpm + Turborepo monorepo: apps/web, apps/match, apps/mobile, packages/core, packages/tokens, packages/ui). It is deployed at https://whattowatchxinny.vercel.app. Read this whole brief first, save it to `docs/V2_1_PROMPT.md`, and track progress in `docs/PROGRESS.md` under a new "v2.1" heading.

Two changes: (A) search becomes the core of the site, and (B) the match flow changes from an endless deck with a pop-up on every match to rounds with a results screen at the end.

## P — Purpose

WhatToWatch exists to help people find something to watch. Most visitors come alone, with a vague idea ("something like X", "a short comedy on Netflix"), so **search and browse are the main product**, and movie night is the second door. Right now the landing page puts search at the bottom as an afterthought, `/search` is a plain form with no suggestions and no filters, and an empty query shows nothing.

Match flow: the person who starts a night should make a real shortlist before sending it, and the friend should swipe without spoilers, seeing the result only when they're done. "It's a match!" after every card kills the suspense and slows the friend down.

## R — Rules

- Keep the late-night video store design system and voice exactly as it is: tokens, fonts, hard 2px borders, mono labels, TR/EN. Banned list from docs/V2_PROMPT.md still applies (no gradients, emoji, "discover/seamless" copy, hero + 3 feature cards).
- TMDB is still only called server-side through the existing proxy and `@wtw/ui/server` `tmdb()`. Cache like the existing code does.
- All new logic goes in `packages/core` as pure, tested functions (round rules, link codec v2, results). Apps stay thin. apps/mobile must use the same core logic for the match flow.
- No auth, no new database. Live mode keeps using the existing `RoomStore` (Redis in production is now on: `/match/api/status` returns `live: true`).
- Old v1 links must keep decoding; don't break links already sent.
- No new UI dependencies beyond what's already installed, except a debounce helper if you really need one (prefer writing 10 lines).
- Commit after each working step (Conventional Commits). Work on `v2`; merge into `main` only as the very last step (Motion 10), after everything is green and verified on production.

## I — Interface

### A. Search first

**Landing (`apps/web/app/page.tsx`)**
- The hero becomes the search: the headline asks the question (TR: "Ne izlesek?", EN: "What are we watching?", or better lines in the same voice), then a large search field with instant suggestions directly underneath. "Start a movie night →" stays as a clearly visible secondary action next to/under the search, with the join-code form.
- The shelf (trending) stays below the hero.
- Below the shelf, add 3–4 quick browse rows that link into `/search` with filters already set, e.g. "Under 100 minutes", "On your services tonight" (region providers), "Old but gold" (before 2000, high rating), "Turkish films". Real TMDB data, same shelf component.

**Instant suggestions (shared component in apps/web)**
- Debounced (~250ms) suggestions after 2 characters, from a new cached route `/api/suggest?q=` that returns at most 8 items: titles (poster thumb, title, year, movie/series) plus at most 2 people.
- Full keyboard support (↑/↓/Enter/Esc), proper combobox ARIA. Enter with no selection goes to `/search?q=`. Clicking a suggestion opens its detail page.
- The header search (on every page) uses the same component, collapsed to an icon-button on mobile.

**`/search` page**
- Works with or without a query. No query = browse mode (TMDB discover). With a query = search mode (TMDB search, then the filters applied).
- Filters, all in the URL (shareable, back button works): type (all/movie/series), genres (multi), year range, max runtime, min TMDB rating, "only on my services" (providers for the region, same picker as match setup; the chosen services are remembered in a cookie via the existing prefs mechanism), sort (popular / rating / newest). Original language as one simple option ("Turkish only").
- Results grid shows poster, title, year, rating, and provider logos for the region (at most 3 per card). Fetch providers per result server-side with long caching. If that's too slow, show logos only for the first 20 and lazy-load the rest.
- "Load more" pagination (button, not infinite scroll), keeping filters.
- Empty state in the brand voice, with one-click "loosen filters" suggestions (drop the rating, widen the years, any service).
- On mobile, filters live in a bottom sheet, with an "N filters" chip and "clear all".
- People and collections results stay, below titles.

### B. Match rounds (link mode, and live mode where noted)

**Round rule for the person who starts the deck (initiator)**
- The deck opens with **10 cards**.
- "Seen it" (swipe up) doesn't count as a vote. That card is replaced by the next one, so a round always has 10 (then 5) cards that get a yes or no.
- At the end of a round, `likes / voted >= 30%` means the deck is done → the share screen.
- Otherwise **5 more cards** are dealt and the check runs again at the end, on all cards voted so far. Threshold = `ceil(0.3 × voted)`: 10 → 3, 15 → 5, 20 → 6, 25 → 8, 30 → 9.
- Hard cap: 30 voted cards. If the cap is reached without hitting 30%: with at least 1 like, go to the share screen anyway ("Picky tonight. Sending what you've got."); with 0 likes, offer "loosen filters" and a new deck.
- Progress is always visible as a tape counter, e.g. `LIKED 2 / NEED 3 · CARD 7 OF 10`. Share is not available mid-round.
- Constants (`ROUND_FIRST = 10`, `ROUND_EXTRA = 5`, `LIKE_RATIO = 0.3`, `MAX_VOTED = 30`) live in `packages/core` in one place.

**Share screen (initiator)**
- Shows how many they liked (not which ones, to keep it blind), a big share button (native share on touch, copy elsewhere), and a short line: TR "Linki at, o da kaydırsın. Sonuçlar onun ekranında." (rewrite in the same voice if you can do better).

**Friend (and any further voter)**
- Swipes **exactly the cards the initiator voted on**, in the same order, minus the ones the initiator marked "seen it". No round rule for the friend; their deck is fixed.
- **No match pop-up during swiping.** Remove the per-card `MatchOverlay` trigger. Their counter just shows `CARD 4 OF 13`.
- When their last card is swiped → **results screen**: TR headline "Bunlarda anlaştınız." / EN "You both said yes to these." (in voice; never "It's a match!"). Matched titles as big cards with poster, runtime, rating, and where-to-watch for the region, ordered by deck order. Primary action on each: "Where to watch" → detail page.
- Below: "Send results back" (share a link that opens straight to the results for everyone, no swiping) and "Add another person" (share a link that gives a third person the same fixed deck; results recompute for all).
- Zero matches: an honest empty state ("Zero overlap. Impressive, honestly.") with two actions: "Swap: you start this time" (new deck with the same filters, roles flipped) and "Loosen filters".

**Link codec v2 (`packages/core/src/link.ts`)**
- The deck is now **stored explicitly in the link** as an ordered list of title keys (keep order; don't sort, delta-encode against the previous id with zigzag varints so negative deltas work). Deck regeneration from the seed is unreliable because TMDB's ordering changes daily, and the friend must get exactly the same cards.
- Payload: `version=2, filters, seed, deck: TitleKey[], voters: { name, likes, seen }[], finished: boolean` (`finished` = results link).
- v1 links still decode and behave as before (seed-generated deck, friend swipes the first `max(10, initiator votes)` cards).
- Keep links short: show the encoded length of a 30-card, 3-voter link in the test output; it must stay under 600 characters.

**Live mode (`apps/match` live rooms) — same spirit**
- No per-card match pop-up. Everyone sees `waiting for <names>` after finishing, then the same results screen.
- The deck is shared. The round rule applies to the room: after the first 10, if **any** member is below 30%, the room adds 5 cards for everyone (cap 30). The room is done when every current member has voted on every card in the room deck. Server-side in the existing room actions, idempotent (two members finishing at the same moment must extend the deck at most once).

**Mobile (`apps/mobile`)**
- Same round rule, share screen, friend flow, results screen and codec v2, using the core functions. Search is out of scope on mobile for now.

## S — Structure

```
packages/core/src/
  rounds.ts        pure: roundState(votes, deck) → { phase: 'swiping'|'extend'|'done'|'capped-empty', need, liked, voted, nextSize }
  results.ts       pure: matchesFromVoters(deck, voters) → ordered TitleKey[]
  link.ts          codec v2 + v1 decode
  search.ts        pure: parse/serialize search filters ⇄ URLSearchParams, build discover params
apps/web/
  app/api/suggest/route.ts
  components/search-box.tsx       (client, combobox)
  components/search-filters.tsx   (client, sheet on mobile)
  app/search/page.tsx             (server; reads filters via core/search.ts)
apps/match/
  components/round-counter.tsx, share-screen.tsx, results-screen.tsx
  (remove the per-card MatchOverlay usage in link-room.tsx and live-room.tsx; delete the component if it's unused)
```
Each component stays under ~150 lines; extract hooks rather than nesting.

## M — Motion (order of work)

1. Read docs/V2_PROMPT.md, REPORT.md, and the current files named above. Write a short plan into PROGRESS.md.
2. `packages/core`: rounds.ts, results.ts, codec v2 (+ v1 compatibility), search.ts, all with Vitest tests (see the edge cases below).
3. Match, link mode: initiator rounds → share screen → friend deck → results → send back / add person. Remove the per-card overlay.
4. Match, live mode: room-level rounds, waiting state, results.
5. Mobile: same flow on core.
6. Web search: /api/suggest, search-box (landing + header), /search with filters, browse mode, provider logos, load more, empty states, mobile sheet.
7. Landing rework: search hero + browse rows.
8. Playwright:
   - (a) initiator likes 2 of 10 → 5 more appear → likes 3 more → share screen appears (5/15 ≥ 30%);
   - (b) initiator likes 3 of 10 → share screen right away; the friend opens the link, sees exactly those 10 cards in order, no overlay appears while swiping, results screen lists the common likes;
   - (c) zero-overlap results screen;
   - (d) v1 link still opens;
   - (e) search: suggestions appear and are keyboard-navigable; filters survive reload and back; "only my services" filters results;
   - (f) live mode locally with two contexts: one member under 30% extends the deck for both, results appear for both only when both finish.
9. Full `pnpm turbo run lint typecheck test build`, e2e (link-mode tests also against production after deploy), redeploy whattowatch-web and whattowatch-match with `vercel --prod`, curl / /search /match/new /api/health /api/suggest?q=matrix. Update README (briefly), REPORT.md, PROGRESS.md. Push v2.
10. Merge into main: `git checkout main && git pull --ff-only && git merge --ff-only v2` (main has had no commits since v2 branched; if fast-forward fails, stop and show me `git log --oneline main..v2` and `v2..main` instead of forcing anything). `git push origin main`. Keep the v2 branch. On GitHub, set main as the default branch if it isn't already. If either Vercel project is connected to Git with main as its production branch, wait for that deploy to finish and curl production again; if not, note in REPORT.md that deploys are CLI-only. Show `git log --oneline -1 main` and `git status`.

## KERNEL CHECK (show proof for each before saying done)

- **K — Key output:** screenshots at 375px and 1280px of the landing, /search with filters open, the round counter, the share screen, and the results screen (match and zero-match). Show them.
- **E — Edge cases:** "seen it" on every card of a round (deck refills, can't loop forever, stops at TMDB end with a message); undo across a round boundary (undoing the 10th vote returns to the round instead of showing the 5 extra cards); a deck with fewer than 10 available titles for the filters (round = whatever exists, the rule uses what's there); a friend opening a link while the initiator is still on an old tab; the same name used by two voters; a link opened by the initiator themself (shows "waiting for your friend", not a second deck); a results link with one voter (no matches possible → explain); a search with a Turkish query (ç ğ ı ö ş ü), a 1-character query, a query with only spaces; filters that contradict each other (min year > max year: swap them).
- **R — Reusable:** round, results and codec logic used by web match, live rooms and mobile from `packages/core`, with no copies.
- **N — Nested logic avoided:** `roundState` is a single pure function with a table-driven test; components switch on `phase`, without nested ifs.
- **E — Error states:** suggest-route failure hides the dropdown silently and Enter still works; TMDB 429 on search shows the brand-voice error with retry; a broken or truncated link shows "This tape is chewed up" with a "start a new night" action.
- **L — Least surprise:** share is never available mid-round, the counter always tells you what's needed, the friend never sees a result before finishing, back/reload never loses swipes (sessionStorage keyed by seed, as now), and search filters always reflect the URL. The merge never rewrites history (no force push, no rebase of main).
