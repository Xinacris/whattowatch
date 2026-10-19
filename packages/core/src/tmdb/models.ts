// What the apps render. Plain JSON so it crosses the network and the RN bridge untouched.

export type MediaType = "movie" | "tv";
/** "m603" or "t1396": TMDB ids collide across movie and tv. */
export type TitleKey = `${"m" | "t"}${number}`;

export interface TitleSummary {
  key: TitleKey;
  id: number;
  type: MediaType;
  title: string;
  year: number | null;
  poster: string | null;
  rating: number | null;
  overview: string;
  genreIds: number[];
}

export type ProviderKind = "sub" | "free" | "ads" | "rent" | "buy";

export interface Provider {
  id: number;
  name: string;
  logo: string | null;
  kind: ProviderKind;
}

export interface CastMember { id: number; name: string; role: string | null; photo: string | null }

export interface TitleDetail extends TitleSummary {
  backdrop: string | null;
  tagline: string | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
  cast: CastMember[];
  directors: string[];
  trailer: string | null; // YouTube key
  providers: Provider[];
  providersLink: string | null; // TMDB's JustWatch page for the region
  collection: { id: number; name: string } | null;
  seasons: number | null;
}

export interface PersonSummary { id: number; name: string; photo: string | null; department: string | null; knownFor: string[] }

export interface PersonDetail {
  id: number;
  name: string;
  photo: string | null;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  birthplace: string | null;
  department: string | null;
  credits: (TitleSummary & { role: string | null })[];
}

export interface CollectionDetail { id: number; name: string; overview: string; poster: string | null; backdrop: string | null; parts: TitleSummary[] }

export interface SearchResults { titles: TitleSummary[]; people: PersonSummary[] }

/** A swipe card: a summary plus what the deck needs to show without another fetch. */
export interface DeckCard extends TitleSummary {
  runtime: number | null;
  genreNames: string[];
  providers: Provider[];
  cast: string[];
}

export function titleKey(type: MediaType, id: number): TitleKey {
  return `${type === "movie" ? "m" : "t"}${id}`;
}

export function parseTitleKey(key: string): { type: MediaType; id: number } | null {
  const m = /^([mt])(\d+)$/.exec(key);
  if (!m) return null;
  return { type: m[1] === "m" ? "movie" : "tv", id: Number(m[2]) };
}
