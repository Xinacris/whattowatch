You are working on Xinacris/whattowatch (pnpm + Turborepo). main is at 8a48df5, live at https://whattowatchxinny.vercel.app, and Vercel deploys from Git (main → production, other branches → preview). Create branch `v2.3` from main, save this brief to `docs/V2_3_PROMPT.md`, and track progress in `docs/PROGRESS.md` under "v2.3".

## P — Purpose

Series grouping doesn't work in the swipe deck in real use. Tested on production: the deck dealt "The Hobbit: The Battle of the Five Armies", "Avatar: Fire and Ash", "Zootopia 2" and "Toy Story 5" as separate title cards. Cause: the v2.2 rule in `packages/core/src/collections.ts` (`groupIntoCollections` / `settleGroups`) only collapses when **2+ parts appear in the same list**, and a lone part "stays a title". Discover pages usually contain one part per series (the newest/most popular), so the deck almost never groups.

New rule, everywhere (deck, search, suggestions, shelves, results): **a movie that belongs to a TMDB collection with 2 or more released parts is always shown as that collection**, even if it is the only part in the list. The user wants to decide on "the Hobbit series", not on part 3.

Second change: **a new round rule** for whoever starts a deck. The 30% rule is hard to read, and on production the counter showed the wrong target (it said "NEED 9" at 20 cards, but the round ended at 6 likes). We're replacing it with a fixed target that's easy to understand.

Tone note: this is two people picking something to watch together, not a contest. Nothing in the copy or UI may frame it as speed, scores, winning or rewards (no "fast", "record", "well done", "you beat…").

## R — Rules

- Same design system, voice, TR/EN, banned list, no auth, TMDB server-side only, logic in packages/core with Vitest tests, shared by web/match/live/mobile.
- Codec v1/v2/v3 links keep working; a like on a part still counts as a like on its collection.
- No force push. Merge into main at the end with `--ff-only`.

## I — Interface

1. **Grouping rule.** Change the core so a single part becomes a collection entry when its collection has ≥ 2 released parts (after `toCollectionSummary`'s unreleased filter). If the collection fails to load, or has < 2 released parts, it stays a title (today's fallback). Remove `partOf` "lone part" tags where they'd now be a collection card. Update the doc comments; the old "a lone part stays a title" is wrong now.
2. **Which part brought it in.** The collection card shows a small tape label for the part that matched the list, when that part isn't the first one: TR "Yeni: Zootopia 2" if it's the latest released part and released within the last 12 months, otherwise "İçinde: Hobbit: Beş Ordunun Savaşı". On the back of the deck card, that part is highlighted in the list. In search, a query for a specific part ("hobbit five armies") shows the collection card with that part highlighted on `/collection/[id]` (anchor/highlight).
3. **Deck.** A collection is dealt at the position of its first hit and only once per deck (dedupe across pages and rounds, as now). Filters still pass a collection when at least one part passes. One collection = one card = one vote.
4. **Series names.** TMDB's TR collection names come with bracket suffixes, e.g. "Yüzüklerin Efendisi [Seri]", "[Animasyon-Seri]". Normalize them in core: `X [Seri]` → `X Serisi`, `X [Animasyon-Seri]` → `X Animasyon Serisi`; generic `[...]` suffix → drop the brackets. EN "X Collection" stays. Table-driven test.
5. **Search noise (small).** Titles with 0 votes, no poster, or no release date (e.g. "Shrek 6") go to the end of search results and never appear in suggestions or the deck, unless the title exactly equals the query (case/diacritic-insensitive).
6. **Round rule v2 (replaces the 30% rule everywhere: link mode, live rooms, mobile).** Constants in one place in core: `ROUND_FIRST = 15`, `ROUND_EXTRA = 5`, `LIKE_TARGET = 5`, `MAX_VOTED = 30`. Delete `LIKE_RATIO` and the ceil(30%) logic.
   - **Link mode, initiator:** the deck opens with 15 cards. The target is a fixed **5 likes total**. The moment the 5th like lands (even mid-round), go to the share screen. The cards not swiped yet are simply not part of the deck; the friend swipes exactly the cards the initiator voted on, as now.
   - If the 15 cards run out with fewer than 5 likes: 5 more cards are dealt, and this repeats until 5 likes or 30 voted cards. At the cap: with at least 1 like, go to the share screen ("Sending what you've got."); with 0 likes, offer "loosen filters" and a new deck (unchanged).
   - "Seen it" still doesn't count and is still replaced by a new card. One collection = one card = one vote. A like on a `c:` key counts.
   - Undo from the share screen (right after the 5th like) goes back to the deck with 4 likes.
   - Counter: `LIKED 3 / 5 · CARD 8 OF 15` (TR: `3 / 5 BEĞENİ · KART 8 / 15`). The target number is **always 5**; only the card total grows (15 → 20 → 25 → 30). The extension note stays short: TR "5 kart daha.", EN "Five more."
   - **Live rooms:** everyone swipes the shared deck; nobody stops early, since matches need overlapping votes. The room deals 15 cards; when everyone has voted on every dealt card, if any current member has fewer than 5 likes and the deck has fewer than 30 cards, 5 more are dealt for everyone (idempotent, as now). Otherwise the room goes to results.
   - Mobile: same core function, same counter.
   - `roundState` keeps its table-driven test, rewritten for the new rule (include: 5 likes in the first 5 cards; 5th like on card 15; 4 likes after 15 → extension; 4 likes after 30 → share; 0 after 30 → loosen; seen-it on the 5th-like position; undo after the 5th like; collection likes; live room with one member at 3 likes).
   - Old links (v1/v2/v3) keep decoding. Their deck is fixed in the link, so the friend's side doesn't change.

## S — Structure

Only touch: `packages/core/src/collections.ts` (+ tests), the search/deck code that calls it, the collection card label, `/collection/[id]` highlight, and the name normalizer. No new files unless a new pure function needs its own module.

## M — Motion

1. **Reproduce first.** Write failing tests: (a) a core test where a single Hobbit part plus unrelated titles groups into the Hobbit collection; (b) a Playwright test on a deck seeded/mocked to contain only "The Hobbit: The Battle of the Five Armies" from its series: the card is "The Hobbit Collection" (TR: "Hobbit Serisi"), and no Hobbit part appears later. Show them failing.
2. **Diagnose the old counter before replacing it.** On the current code (before I.6), reproduce and explain two production observations in PROGRESS.md: (a) at 20 cards the counter said "NEED 9" while the round actually ended at 6 likes (the displayed target and the `roundState` target disagree); (b) a screenshot showed "LIKED 0 / NEED 5 · CARD 11 OF 15" after a first round that apparently had several likes (do likes reset across rounds, or don't likes on collection cards count?). Write a failing test for each real bug you find. These tests must pass under the new rule too (adapted to its numbers), so the same class of bug can't come back.
3. Implement I.1–I.6. Order: I.6 (round rule) first, since it's the riskiest, then I.1–I.5.
4. Tests green, screenshots of: the counter at card 8 of 15 and after an extension (card 17 of 20), the share screen reached mid-round on the 5th like, the deck at 375 and 1280 showing the Hobbit/Avatar/Zootopia/Toy Story series cards (front, and back with the highlighted part), search "hobbit" TR and EN, search "shrek" (no "Shrek 6" near the top). Show them.
5. Push v2.3 → wait for both Git-triggered Preview deploys to reach READY → run the Playwright suite against the preview URL. Then `git checkout main && git merge --ff-only v2.3 && git push origin main` → wait for both Production deploys READY → run the suite against production and curl /, /search?q=hobbit, /match/new, /api/health, /match/api/status.

6. **Repo cleanup (after step 5 is verified on production).** Branch `cleanup` from main. The repo should contain only what's needed to build, run, test, and deploy the product, plus a README.
   - **AI/tooling files out of the repo, but kept on my disk:** `git rm -r --cached` for `.agents/`, `.claude/`, `apps/mobile/.claude/`, `skills-lock.json`, and any other agent/skill files you find. Add them to `.gitignore` (`.agents/`, `.claude/`, `**/.claude/`, `skills-lock.json`) so they never come back, and remove the matching lines you added to `.git/info/exclude`. Do **not** delete them from disk; I still use them locally.
   - **Process docs out:** delete `docs/V2_PROMPT.md`, `docs/V2_1_PROMPT.md`, `docs/V2_2_PROMPT.md`, `docs/V2_3_PROMPT.md`, `docs/PROGRESS.md`, `docs/COPY.md`, `REPORT.md`. (I keep the prompts elsewhere.)
   - **HUMAN_TODO.md → GitHub issues:** before deleting it, open one issue per item that is still open (EAS builds + store accounts, universal links/assetlinks, the remaining rough edges from REPORT.md) with `gh issue create`, each with the concrete steps from the file, and the label `todo` (create the label if needed). Then delete HUMAN_TODO.md. Show the issue list.
   - **Screenshots:** keep only the images the README uses (at most 3), retaken after v2.3 at 1280px and compressed (lossless PNG optimization or WebP, each < 300 KB), in `docs/`. Delete the rest of `docs/screens/`. Change `e2e/screens.spec.ts` to write to a gitignored `.screens/` folder, with a `--readme` option (or env flag) that refreshes the README images.
   - **Expo template leftovers:** delete every asset in `apps/mobile/assets` that nothing references (check app.json, `expo.icon`, and the source with grep). Today that includes react-logo*, expo-badge*, expo-logo, tutorial-web, tabIcons/*, logo-glow. Keep the icon/splash/adaptive-icon files that app.json uses.
   - **Dead code:** run `npx knip` (configured for the workspace) and remove unused files, exports, and dependencies it reports. Only remove what you have confirmed unused with grep. Don't touch anything Next.js/Expo loads by convention (routes, layouts, config files).
   - **README:** remove links to the deleted files; point to GitHub issues for open work; keep it short and accurate, in the same voice.
   - Verify: `pnpm install --frozen-lockfile` (update the lockfile if dependencies were removed), the full turbo pipeline, the whole Playwright suite, `npx expo-doctor` and both `expo export` runs in apps/mobile. Push `cleanup`, wait for the Preview deploys to reach READY, fast-forward merge into main, push, wait for Production READY, curl production again. Show `git ls-files | grep -v -E '^(apps|packages|e2e)/'` at the end so I can see the root is clean.

## KERNEL CHECK (show proof)

- **K — Key output:** on production, a fresh deck shows no movie that belongs to a 2+ part series as a separate card (show a Playwright check that walks 30 cards and asserts that no title card has a collection with ≥2 released parts).
- **E — Edge cases:** a series with exactly 2 released parts + 1 unreleased (e.g. a newly announced sequel) groups and shows "2 films"; a series where the only released part is the hit (stays a title); the same series reached through two different parts on different pages (dealt once); old links whose votes are on part keys still match the collection; TV unaffected; the round counter cases in M.2; the counter's target and `roundState`'s target come from the same constant (assert in a test that the rendered counter text uses `LIKE_TARGET`); a deck where TMDB runs out before 15 cards (the round is whatever exists, then the same 5-like / cap logic); a friend deck of only 5 cards (the initiator liked the first 5) works and its results screen is correct.
- **R — Reusable:** one rule in core, used by every surface; no surface-specific grouping logic.
- **N — Nested logic avoided:** grouping stays one pass with a Map.
- **E — Error states:** collection fetch failure → shown as a title, never an empty card or a page error.
- **L — Least surprise:** a series always looks the same wherever it appears, and the card always tells you which part brought it in.
