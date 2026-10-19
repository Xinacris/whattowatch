// The subset of TMDB v3 responses we actually read.

export type RawMedia = "movie" | "tv";

export interface RawGenre { id: number; name: string }

export interface RawListItem {
  id: number;
  media_type?: RawMedia | "person" | "collection";
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  overview?: string;
  vote_average?: number;
  vote_count?: number;
  genre_ids?: number[];
  popularity?: number;
  known_for_department?: string;
  known_for?: RawListItem[];
}

export interface RawPage<T = RawListItem> { page: number; total_pages: number; total_results: number; results: T[] }

export interface RawProvider { provider_id: number; provider_name: string; logo_path: string | null; display_priority?: number; display_priorities?: Record<string, number> }

export interface RawRegionProviders { link?: string; flatrate?: RawProvider[]; free?: RawProvider[]; ads?: RawProvider[]; rent?: RawProvider[]; buy?: RawProvider[] }

export interface RawCast { id: number; name: string; character?: string; profile_path?: string | null; order?: number }
export interface RawCrew { id: number; name: string; job?: string; department?: string; profile_path?: string | null }

export interface RawDetail extends RawListItem {
  runtime?: number | null;
  episode_run_time?: number[];
  genres?: RawGenre[];
  tagline?: string;
  number_of_seasons?: number;
  status?: string;
  belongs_to_collection?: { id: number; name: string; poster_path?: string | null } | null;
  credits?: { cast?: RawCast[]; crew?: RawCrew[] };
  videos?: { results?: { key: string; site: string; type: string; official?: boolean }[] };
  "watch/providers"?: { results?: Record<string, RawRegionProviders> };
  created_by?: { id: number; name: string }[];
}

export interface RawPerson {
  id: number;
  name: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  profile_path?: string | null;
  known_for_department?: string;
  combined_credits?: { cast?: (RawListItem & { character?: string })[]; crew?: (RawListItem & { job?: string })[] };
}

export interface RawCollection { id: number; name: string; overview?: string; poster_path?: string | null; backdrop_path?: string | null; parts?: RawListItem[] }
