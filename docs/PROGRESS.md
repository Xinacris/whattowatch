# v2 progress

- [x] 0. Audit & safety
- [x] 1. Monorepo skeleton
- [x] 2. packages/core
- [ ] 3. apps/web
- [ ] 4. apps/match
- [ ] 5. Microfrontends
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
