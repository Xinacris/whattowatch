"use client";
import { create } from "zustand";
import { appendPage, needsNextPage, type DeckCard, type Lang, type RoomFilters, type TitleKey, type Vote } from "@wtw/core";
import { api } from "./api";

interface Swipe { key: TitleKey; vote: Vote }

interface DeckState {
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
  start(filters: RoomFilters, seed: string, lang: Lang, prior?: Record<string, Vote>): void;
  swipe(vote: Vote): Swipe | null;
  undo(): Swipe | null;
  fetchMore(): Promise<void>;
}

/** Cards not yet voted on, in deck order. */
export const remaining = (s: Pick<DeckState, "cards" | "votes">) => s.cards.filter((c) => !s.votes[c.key]);

export const useDeck = create<DeckState>((set, get) => ({
  filters: null, seed: "", lang: "en", cards: [], votes: {}, page: 0, done: false, loading: false, error: false, last: null,

  start(filters, seed, lang, prior = {}) {
    set({ filters, seed, lang, cards: [], votes: { ...prior }, page: 0, done: false, loading: false, error: false, last: null });
    void get().fetchMore();
  },

  async fetchMore() {
    const s = get();
    if (!s.filters || s.loading || s.done) return;
    set({ loading: true, error: false });
    try {
      const res = await api.deck(s.filters, s.seed, s.page, s.lang);
      set((st) => ({ cards: appendPage(st.cards, res.cards), page: st.page + 1, done: res.done, loading: false }));
      // A page can come back fully voted (resumed session) or thin after runtime filtering.
      const after = get();
      if (needsNextPage(remaining(after).length, after.done, false)) void get().fetchMore();
    } catch {
      set({ loading: false, error: true });
    }
  },

  swipe(vote) {
    const top = remaining(get())[0];
    if (!top) return null;
    const swipe = { key: top.key, vote };
    set((st) => ({ votes: { ...st.votes, [top.key]: vote }, last: swipe }));
    const s = get();
    if (needsNextPage(remaining(s).length, s.done, s.loading)) void s.fetchMore();
    return swipe;
  },

  undo() {
    const last = get().last;
    if (!last) return null;
    set((st) => {
      const votes = { ...st.votes };
      delete votes[last.key];
      return { votes, last: null };
    });
    return last;
  },
}));
