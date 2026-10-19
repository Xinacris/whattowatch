You are working on Xinacris/whattowatch (pnpm + Turborepo: apps/web, apps/match, apps/mobile, packages/core, packages/tokens, packages/ui). main and v2 are at f2c807c, live at https://whattowatchxinny.vercel.app. Create branch `v2.2` from main. Save this brief to `docs/V2_2_PROMPT.md` and track progress in `docs/PROGRESS.md` under a new "v2.2" heading.

Three changes: (A) cut the copy down, (B) treat film series (TMDB collections) as one thing in search and in the deck, (C) connect both Vercel projects to GitHub. Step (C) was skipped last round; it isn't optional this time.

## P — Purpose

- **Copy:** the voice is right, but every screen says too much. People use this on a couch at night with a phone in one hand. A screen should be readable in two seconds.
- **Series:** searching "yüzüklerin efendisi" or "shrek" today returns The Fellowship, The Two Towers, The Return of the King… as separate results, and the swipe deck deals Shrek, Shrek 2 and Shrek the Third as three separate cards. People pick a series as one decision ("let's do Shrek tonight"), so search and the deck should show **one card for the series**.
- **Git:** deploys should happen on push, not by hand.

## R — Rules

- Same design system, voice, TR/EN, and banned list as docs/V2_PROMPT.md. No auth. TMDB only server-side.
- All logic goes in `packages/core` as pure functions with Vitest tests; web, match, live rooms and mobile use it with no copies.
- Links already sent (codec v1 and v2) must keep decoding.
- Don't print tokens. No force push, no history rewrite.
- Commit per working step. Merge into main only at the end (Motion 8).

## I — Interface

### A. Copy diet (all strings in packages/core/src/strings.ts, TR and EN, plus any hardcoded copy in apps/*)

Limits, per screen:
- Headline: at most 6 words.
- At most **one** supporting line under it, at most 12 words. No stacks of kicker + subhead + paragraph. Pick the one that matters and delete the others.
- Buttons: at most 3 words. At most 2 buttons visible at once in any results/empty state. Move the rest behind a single "More" text link or remove them.
- Labels/kickers: only where they carry information (counters, codes, names), never decoration.
- Header search placeholder must fit without truncation at 1280px and in the mobile sheet (e.g. TR "Film, dizi, oyuncu", EN "Title or actor").
- Footer: just the TMDB attribution plus one short line; don't repeat the "open late" tagline that's already in the header badge.

Known problems to fix (seen in docs/screens):
- Share screen: "YOU SAID YES TO 5." + "WHICH ONES STAYS BETWEEN YOU AND THE TAPE." + a paragraph + "OR COPY IT FROM HERE". Keep the headline, one line, the button, and the copy field without a label.
- Zero-match results: show headline, one line, and 2 buttons ("You start this time", "Loosen filters"). "Send results back" / "Add another person" go behind "More".
- **Bug:** the zero-match results screen still shows the "AYŞE ALREADY SWIPED. YOUR TURN." kicker. "Your turn" must never appear on any results screen.
- Landing: the "Deciding with someone?" block has 3 sentences. Make it one.
- Remove grammar slips (e.g. "which ones stays").
- TR is written natively, not translated: short, natural, the same dry humour.

Deliverable for this part: `docs/COPY.md`, a table with key | old EN | new EN | old TR | new TR for every changed string, with word counts. Show it to me in the conversation.

### B. Series as one card

**Model (packages/core)**
- A new deck/result item kind: `collection`. Key format `c:<collectionId>` next to the existing title keys. Union type `ItemKey = TitleKey | CollectionKey`, with `parseItemKey` / `itemKey` helpers.
- `CollectionSummary`: id, name (localized), poster, backdrop, parts (ordered by release date, unreleased ones excluded), partCount, yearFrom–yearTo, total runtime, average rating, genres (union of the parts).
- A pure `groupIntoCollections(items, collectionOf)`: given an ordered list of titles and a lookup `movieId → collectionId | null`, it returns items where **2 or more parts of the same collection** are collapsed into one collection item at the position of the first part. A single part stays a title but carries `partOf: { id, name }`. TV shows are never grouped (TMDB has no collections for TV).
- The lookup comes from movie details (`belongs_to_collection`). Fetch through one shared, cached loader (`movieMeta(id)` with revalidate 7 days, concurrency limit ~8, retry/backoff on 429). This same loader also serves runtime and providers, which fixes the slow-search rough edge in REPORT.md: details are fetched once and cached, not per filter.

**Search (`/search` + suggestions)**
- Results grid: parts are collapsed into a collection card with the collection poster, name ("Yüzüklerin Efendisi Serisi"), a tape label `3 FİLM · 2001–2003`, and the provider logos available for at least one part. The card links to the existing `/collection/[id]` page.
- Also query TMDB `/search/collection` (already in core). A collection that matches the query by name is put at the top even if none of its parts came back in the title search.
- Remove the separate "Collections" sticker row; collections live in the grid now.
- Suggestions dropdown: same grouping; a collection shows as "Shrek Serisi · 5 film".
- A single part shown alone gets a small "Shrek serisinden" tag, linking to the collection.
- Filters: a collection passes when **at least one part** passes (genre, year range, runtime, rating, services). The card says which parts match if not all do ("2 of 5 on Netflix").
- `/collection/[id]`: parts in order, each with year, runtime, rating and where to watch for the region; a "Where to start" hint (first part) at the top. Tighten its copy too.

**Deck (link mode, live rooms, mobile)**
- Deck pages are grouped the same way: Shrek, Shrek 2 and Shrek the Third become one card "Shrek Serisi". Once a collection is dealt, later parts never appear as separate cards in that deck (dedupe across pages and rounds).
- Collection card front: collection poster, name, `5 FİLM · 2001–2010`, rating, provider logos. Back (tap to flip): ordered list of parts with year and runtime.
- One collection = one card = one vote in the round rule (10/5/30%).
- A like on a collection matches a like on the same collection. Results screen: a collection result shows the series card with "Start with: Shrek (2001)" and links to /collection/[id].
- Codec v3: encode item kind with the key (e.g. `n = id * 3 + kind`, kind ∈ movie/tv/collection; keep zigzag delta and deck order). v1 and v2 links still decode. Test that a 30-item, 3-voter v3 link stays under 600 characters, and show the length.
- Deck filters apply as in search (a collection passes if at least one part passes).

### C. Vercel ↔ GitHub (required)

- In `apps/web` and `apps/match`: `vercel git connect` to Xinacris/whattowatch.
- Per project (Vercel REST API `PATCH /v9/projects/{idOrName}` using the CLI's auth, or `vercel project` commands if they cover it; never echo the token): Root Directory `apps/web` / `apps/match`, framework nextjs, install and build commands that work in the pnpm + turbo monorepo, include files outside the root directory, production branch `main`, Ignored Build Step `npx turbo-ignore`.
- Prove it: push `v2.2`, and both projects get a Git-triggered **Preview** deployment that reaches READY. Show `vercel ls` (or the API response) and curl `/`, `/search?q=shrek`, `/match/new` on the web preview URL.
- If it truly can't be done from here (e.g. the Vercel GitHub app isn't installed or lacks access to the repo), show the exact error output, write the fix steps in HUMAN_TODO.md, and **tell me at the top of your final report**. Don't just note "CLI-only" in REPORT.md.

## S — Structure

```
packages/core/src/
  item-key.ts       ItemKey union + parse/format
  collections.ts    CollectionSummary mapper + groupIntoCollections (pure)
  movie-meta.ts     types for the cached loader's output (the loader itself lives in packages/ui/server)
  link.ts           codec v3 + v1/v2 decode
  strings.ts        trimmed copy
packages/ui/src/server/movie-meta.ts   cached, concurrency-limited loader
packages/ui/src/…/collection-card.tsx  shared card used by search, shelf, results
apps/match + apps/mobile               collection card face/back, results entry
docs/COPY.md
```
Components stay under ~150 lines.

## M — Motion

1. Branch `v2.2`, save the brief, plan in PROGRESS.md.
2. (C) first: connect Git and get a READY preview from a trivial commit, so every later push is checked by a real Vercel build.
3. Core: item-key, collections grouping, codec v3, with tests (table-driven for grouping).
4. Cached movie-meta loader; switch search and deck to it.
5. Search + suggestions + collection page.
6. Deck (link, live, mobile) + results.
7. Copy diet + COPY.md + the kicker bug.
8. Verify, then merge: full `pnpm turbo run lint typecheck test build`, the whole Playwright suite plus new tests below, new screenshots in docs/screens (search "shrek", search "yüzüklerin efendisi" with TR locale, a collection card in the deck front and back, results with a collection, share screen, zero-match screen; at 375 and 1280), shown to me. Then `git checkout main && git merge --ff-only v2.2 && git push origin main`. Wait for both Git-triggered **production** deploys to reach READY and curl production (/, /search?q=shrek, /match/new, /api/health, /match/api/status). Update REPORT.md and README.

New Playwright tests:
- (g) search "shrek": exactly one Shrek collection card, and no separate cards for Shrek 2/3 in the grid.
- (h) TR locale, search "yüzüklerin efendisi": the collection card is first.
- (i) deck seeded so that two parts of one collection fall in the first page: one collection card, and its parts never appear later in the deck.
- (j) a v2 link from before this change still opens and shows its results.
- (k) the zero-match results screen contains no "your turn" text in TR or EN.

## KERNEL CHECK (show proof for each)

- **K — Key output:** COPY.md table shown; screenshots shown; Git preview + production deploys READY shown (or the exact error, reported at the top).
- **E — Edge cases:** a collection where only one part is released (stays a title); a collection whose parts span movie and an unreleased sequel (exclude unreleased from the count and year range); a title search for a specific part ("shrek 2") shows the collection card first with Shrek 2 highlighted on its back; a collection without a poster (use the first part's poster); a localized collection name missing in TR (fall back to EN); a collection where no part is on the selected services (filtered out); a deck that is only collections; a voter liking a collection in v3 while another voter's v2 vote is for a single part of it (treat a part-like as a like on its collection when computing matches).
- **R — Reusable:** one grouping function, one card component (web) + one face (mobile), one loader.
- **N — Nested logic avoided:** grouping is a single pass with a Map; no nested fetch waterfalls (batch the meta lookups per page).
- **E — Error states:** if the meta loader fails for a title, it is shown ungrouped instead of the whole page erroring.
- **L — Least surprise:** a series is always one card in a given list; tapping it always explains what's inside; copy never asks the user to read more than one line to know what to do next.
