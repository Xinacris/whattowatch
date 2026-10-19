# v2 progress

- [x] 0. Audit & safety
- [x] 1. Monorepo skeleton
- [ ] 2. packages/core
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
