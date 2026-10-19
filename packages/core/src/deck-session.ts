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
}

export type FetchDeckPage = (filters: RoomFilters, seed: string, page: number, lang: Lang) => Promise<{ cards: DeckCard[]; done: boolean }>;

/** Cards not yet voted on, in deck order. */
export const remaining = (s: Pick<DeckState, "cards" | "votes">) => s.cards.filter((c) => !s.votes[c.key]);

const EMPTY: DeckState = { filters: null, seed: "", lang: "en", cards: [], votes: {}, page: 0, done: false, loading: false, error: false, last: null };

export function createDeckSession(fetchPage: FetchDeckPage) {
  let state = EMPTY;
  let generation = 0; // a restart drops late responses from the previous deck
  const listeners = new Set<() => void>();
  const set = (patch: Partial<DeckState>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };

  async function fetchMore(): Promise<void> {
    if (!state.filters || state.loading || state.done) return;
    const gen = generation;
    set({ loading: true, error: false });
    try {
      const res = await fetchPage(state.filters, state.seed, state.page, state.lang);
      if (gen !== generation) return;
      set({ cards: appendPage(state.cards, res.cards), page: state.page + 1, done: res.done, loading: false });
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
    start(filters: RoomFilters, seed: string, lang: Lang, prior: Record<string, Vote> = {}) {
      generation++;
      set({ ...EMPTY, filters, seed, lang, votes: { ...prior } });
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
