# v2 progress

- [x] 0. Audit & safety
- [ ] 1. Monorepo skeleton
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
