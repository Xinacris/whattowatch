// The deployed web app is the API. No TMDB credential exists anywhere in this app.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://whattowatchxinny.vercel.app").replace(/\/$/, "");
