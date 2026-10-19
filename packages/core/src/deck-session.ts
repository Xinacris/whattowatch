import { appendPage, needsNextPage } from "./deck";
import type { RoomFilters } from "./filters";
import type { Vote } from "./match";
import type { Lang } from "./region";
import type { DeckCard, TitleKey } from "./tmdb/models";

// The swipe deck as a tiny observable store, shared by web (useSyncExternalStore) and mobile.

export interface Swipe { key: TitleKey; vote: Vote }

export interface DeckState {
  filters: RoomFilters | null;
  seed: string;
  lang: Lang;
  cards: DeckCard[];
  votes: Record<string, Vote>;
  page: number; // next page to fetch
  done: boolean;
  loading: boolean;
  error: boolean;
  last: Swipe | null; // undo goes back exactly one swipe
  /** Fixed deck (friend in link mode, live rooms): these keys, in this order, nothing else. */
  keys: TitleKey[] | null;
  /** Old v1 links: stop after this many cards of the seed deck. */
  limit: number | null;
}

export interface StartOptions { keys?: TitleKey[]; limit?: number }

export type FetchDeckPage = (filters: RoomFilters, seed: string, page: number, lang: Lang) => Promise<{ cards: DeckCard[]; done: boolean }>;
export type FetchCards = (keys: TitleKey[], filters: RoomFilters, lang: Lang) => Promise<DeckCard[]>;

/** A deck that has seen this many pages has seen enough: stop instead of paging forever. */
export const MAX_DECK_PAGES = 40;

/** Cards not yet voted on, in deck order. */
export const remaining = (s: Pick<DeckState, "cards" | "votes">) => s.cards.filter((c) => !s.votes[c.key]);

const EMPTY: DeckState = { filters: null, seed: "", lang: "en", cards: [], votes: {}, page: 0, done: false, loading: false, error: false, last: null, keys: null, limit: null };

export function createDeckSession(fetchPage: FetchDeckPage, fetchCards?: FetchCards) {
  let state = EMPTY;
  let tried = new Set<TitleKey>(); // fixed decks: keys already asked for, so a dead id isn't refetched forever
  let generation = 0; // a restart drops late responses from the previous deck
  const listeners = new Set<() => void>();
  const set = (patch: Partial<DeckState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

  async function fetchFixed(keys: TitleKey[], filters: RoomFilters, gen: number): Promise<void> {
    const missing = keys.filter((k) => !tried.has(k));
    missing.forEach((k) => tried.add(k));
    const got = missing.length && fetchCards ? await fetchCards(missing, filters, state.lang) : [];
    if (gen !== generation) return;
    const all = [...state.cards, ...got];
    const cards = keys.map((k) => all.find((c) => c.key === k)).filter((c): c is DeckCard => Boolean(c));
    set({ cards, loading: false, done: true });
    if (state.keys?.some((k) => !tried.has(k))) void fetchMore(); // keys added while we were loading
  }

  async function fetchMore(): Promise<void> {
    if (!state.filters || state.loading || state.done) return;
    const gen = generation;
    set({ loading: true, error: false });
    try {
      if (state.keys) return await fetchFixed(state.keys, state.filters, gen);
      const res = await fetchPage(state.filters, state.seed, state.page, state.lang);
      if (gen !== generation) return;
      const cards = appendPage(state.cards, res.cards).slice(0, state.limit ?? undefined);
      const page = state.page + 1;
      const done = res.done || page >= MAX_DECK_PAGES || (state.limit !== null && cards.length >= state.limit);
      set({ cards, page, done, loading: false });
      // A page can come back fully voted (resumed session) or thin after runtime filtering.
      if (needsNextPage(remaining(state).length, state.done, false)) void fetchMore();
    } catch {
      if (gen === generation) set({ loading: false, error: true });
    }
  }

  return {
    getState: () => state,
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
    fetchMore,
    start(filters: RoomFilters, seed: string, lang: Lang, prior: Record<string, Vote> = {}, opts: StartOptions = {}) {
      generation++;
      tried = new Set();
      set({ ...EMPTY, filters, seed, lang, votes: { ...prior }, keys: opts.keys ?? null, limit: opts.limit ?? null });
      void fetchMore();
    },
    /** A live room dealt more cards: load the new ones, keep the old. */
    setKeys(keys: TitleKey[]) {
      if (!state.keys || keys.join() === state.keys.join()) return;
      set({ keys, done: false });
      void fetchMore();
    },
    swipe(vote: Vote): Swipe | null {
      const top = remaining(state)[0];
      if (!top) return null;
      const swipe = { key: top.key, vote };
      set({ votes: { ...state.votes, [top.key]: vote }, last: swipe });
      if (needsNextPage(remaining(state).length, state.done, state.loading)) void fetchMore();
      return swipe;
    },
    undo(): Swipe | null {
      const last = state.last;
      if (!last) return null;
      const votes = { ...state.votes };
      delete votes[last.key];
      set({ votes, last: null });
      return last;
    },
  };
}

export type DeckSession = ReturnType<typeof createDeckSession>;
