"use client";
import { useEffect } from "react";
import { linkDeck, makeSeed, nextLink, picksOf, sameVoter, swapLink, voterLabels, withVoter, type LinkPayload } from "@wtw/core";
import { useDeck, remaining } from "@/lib/deck-store";
import { markVoted } from "@/lib/link-progress";
import { linkUrl } from "@/lib/share";
import { useLinkDeck } from "@/lib/use-link-deck";
import { useLinkResults } from "@/lib/use-link-results";
import { Deck } from "./deck";
import { PassPhone } from "./pass-phone";
import { ResultsScreen } from "./results-screen";
import { RoundCounter } from "./round-counter";

/** Everyone after the initiator: a fixed deck, no peeking, results when the last card goes. */
export function LinkFriend({ payload, name, intro }: { payload: LinkPayload; name: string; intro: string }) {
  useLinkDeck(payload, "friend", name);
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
  const voters = withVoter(payload.voters, picksOf(name, deck, state.votes)); // swiping again replaces your earlier picks
  const addPerson = linkUrl(nextLink(payload, deck, voters, false));
  return <FriendResults payload={payload} name={name} deck={deck} voters={voters} addPerson={addPerson} />;
}

interface ResultsProps { payload: LinkPayload; name: string; deck: LinkPayload["deck"]; voters: LinkPayload["voters"]; addPerson: string }

function FriendResults({ payload, name, deck, voters, addPerson }: ResultsProps) {
  const results = useLinkResults(deck, voters);
  // Remember we're done: reload lands back on these results, not on the deck.
  useEffect(() => {
    markVoted(payload.seed, name);
    window.history.replaceState(null, "", addPerson);
  }, [payload.seed, name, addPerson]);
  return (
    <>
      <ResultsScreen
        results={results}
        names={voterLabels(voters.map((v) => v.name))}
        me={voters.findIndex((v) => sameVoter(v.name, name))}
        sendBack={linkUrl(nextLink(payload, deck, voters, true))}
        addPerson={addPerson}
        onSwap={swapTo(payload)}
      />
      <div className="mx-auto flex max-w-4xl px-4 pb-12 sm:px-6"><PassPhone href={addPerson} /></div>
    </>
  );
}

/** Zero overlap: same filters, a fresh stack, and this person goes first. */
export function swapTo(payload: LinkPayload) {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- hard navigation: fresh deck store
  return () => window.location.assign(`/match/link?d=${swapLink(payload, makeSeed())}`);
}
