"use client";
import { useEffect } from "react";
import { linkDeck, makeSeed, matchesFromVoters, nextLink, picksOf, seriesLookup, swapLink, voterLabels, type DeckCard, type LinkPayload } from "@wtw/core";
import { useDeck, remaining } from "@/lib/deck-store";
import { markVoted } from "@/lib/link-progress";
import { linkUrl } from "@/lib/share";
import { useLinkDeck } from "@/lib/use-link-deck";
import { Deck } from "./deck";
import { ResultsScreen } from "./results-screen";
import { RoundCounter } from "./round-counter";

/** Everyone after the initiator: a fixed deck, no peeking, results when the last card goes. */
export function LinkFriend({ payload, name, intro }: { payload: LinkPayload; name: string; intro: string }) {
  useLinkDeck(payload, "friend");
  const state = useDeck();
  const left = remaining(state).length;
  const finished = state.done && !state.loading && left === 0;

  if (!finished) {
    const total = state.done ? state.cards.length : Math.max(state.cards.length, payload.deck.length);
    return (
      <>
        <p className="label mx-auto max-w-md px-4 pt-6 text-label">{intro}</p>
        <Deck onVote={() => {}} onUndo={() => {}} aside={<RoundCounter card={Math.min(total - left + 1, total)} of={total} />} />
      </>
    );
  }
  const deck = linkDeck(payload, state.cards.map((c) => c.key));
  const voters = [...payload.voters, picksOf(name, deck, state.votes)];
  const addPerson = linkUrl(nextLink(payload, deck, voters, false));
  return <FriendResults payload={payload} deck={deck} voters={voters} addPerson={addPerson} cards={state.cards} />;
}

interface ResultsProps { payload: LinkPayload; deck: LinkPayload["deck"]; voters: LinkPayload["voters"]; addPerson: string; cards: DeckCard[] }

function FriendResults({ payload, deck, voters, addPerson, cards }: ResultsProps) {
  // Remember we're done: reload lands back on these results, not on the deck.
  useEffect(() => {
    markVoted(payload.seed);
    window.history.replaceState(null, "", addPerson);
  }, [payload.seed, addPerson]);
  return (
    <ResultsScreen
      results={matchesFromVoters(deck, voters, seriesLookup(cards))}
      names={voterLabels(voters.map((v) => v.name))}
      sendBack={linkUrl(nextLink(payload, deck, voters, true))}
      addPerson={addPerson}
      onSwap={swapTo(payload)}
    />
  );
}

/** Zero overlap: same filters, a fresh stack, and this person goes first. */
export function swapTo(payload: LinkPayload) {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard navigation: fresh deck store
  return () => window.location.assign(`/match/link?d=${swapLink(payload, makeSeed())}`);
}
