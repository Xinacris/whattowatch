# Things only you can do

## 1. Rotate the leaked TMDB credentials
The old `.env` with `REACT_APP_TMDB_API_KEY` / `REACT_APP_TMDB_API_TOKEN` was public on `main`, and it stays in git history even though v2 untracks it.
1. https://www.themoviedb.org/settings/api, regenerate the API key and the read access token.
2. Update Vercel (no echo): `printf %s "$NEW" | vercel env add TMDB_READ_TOKEN production --cwd apps/web --force`, then the same for `preview`, and again with `--cwd apps/match`.
3. Redeploy both projects (see REPORT.md, Deploy).
4. Optional: scrub history with `git filter-repo --path .env --invert-paths` and force-push `main`. Only after rotating; scrubbing doesn't un-leak a key.

## 2. Mobile builds and store submission (EAS)
Needs your Expo and Apple/Google accounts.
1. `cd apps/mobile && npx eas-cli@latest login`
2. `npx eas-cli@latest init`. This writes `extra.eas.projectId` into `app.json`; commit it.
3. `npx eas-cli@latest build:configure`, then set `EXPO_PUBLIC_API_URL=https://whattowatchxinny.vercel.app` in `eas.json` under each build profile's `env`.
4. Preview builds: `npx eas-cli@latest build --platform all --profile preview`
5. Stores: `npx eas-cli@latest submit --platform ios` / `--platform android` (needs an Apple Developer account at $99/yr and a Google Play Console account at $25 once).
6. Universal links (so the https share link opens the app): after the first iOS build, publish `apple-app-site-association` and Android `assetlinks.json` from `apps/web/public/.well-known/` with your Team ID and SHA-256 signing fingerprint (`npx eas-cli@latest credentials`), then redeploy web. The custom scheme `whattowatch://match/<code>` works without this.
