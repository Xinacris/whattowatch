import { useEffect } from "react";
import { router } from "expo-router";
import { freshLink, linkDeck, makeSeed, nextLink, picksOf, remaining, roundState, sameVoter, swapLink, v1DeckSize, voterLabels, votedKeys, withVoter, type LinkPayload } from "@wtw/core";
import { deck, useDeck } from "@/lib/deck";
import { API_URL } from "@/lib/env";
import { useLinkResults } from "@/lib/hooks";
import { markVoted } from "@/lib/link-store";
import { usePrefs } from "@/lib/prefs";
import { Btn, Notice } from "./ui";
import { DeckView } from "./deck-view";
import { ResultsView } from "./results-view";
import { RoundCounter } from "./round-counter";
import { ShareView } from "./share-view";

const url = (token: string) => `${API_URL}/match/link?d=${token}`;
const loosen = () => router.replace("/new");
export const swap = (p: LinkPayload) => () => router.replace({ pathname: "/match/link", params: { d: swapLink(p, makeSeed()) } });

/** Two people, one phone: hand it over; the latest link opens at the name gate. */
export function PassPhone({ token, before }: { token?: string; before?(): Promise<void> }) {
  const { t } = usePrefs();
  const go = async () => { await before?.(); if (token) router.replace({ pathname: "/match/link", params: { d: token, pass: "1" } }); };
  return <Btn title={`${t("link.passPhone")} →`} onPress={() => void go()} style={{ borderWidth: 0, alignSelf: "flex-start", paddingHorizontal: 0 }} testID="pass-phone" />;
}

/** Initiator: 15 cards, then 5 more at a time, until five yeses or 30 cards. Same core rule as the web. */
export function Initiator({ payload, name }: { payload: LinkPayload; name: string }) {
  const { t, lang } = usePrefs();
  useEffect(() => { deck.start(payload.filters, payload.seed, lang); }, [payload, lang]);
  const { cards, votes, done } = useDeck();
  const order = cards.map((c) => c.key);
  const round = roundState(votes, order, done);
  switch (round.phase) {
    case "swiping":
    case "extend":
      return <DeckView onVote={() => {}} onUndo={() => {}} onLoosen={loosen} banner={round.phase === "extend" ? t("round.more") : null}
        header={<RoundCounter liked={round.liked} card={Math.min(round.voted + 1, round.size)} of={round.size} />} />;
    case "done": {
      const keys = votedKeys(order, votes);
      const note = round.reason === "cap" ? t("share.picky") : round.reason === "end" ? t("share.shelfEnd") : null;
      const token = nextLink(payload, keys, [picksOf(name, keys, votes)], false);
      return (
        <ShareView title={t("share.title", { n: round.liked })} line={note ?? t("share.line")} url={url(token)} onShared={() => void markVoted(payload.seed, name)} onUndo={() => deck.undo()}>
          <PassPhone token={token} before={() => markVoted(payload.seed, name)} />
        </ShareView>
      );
    }
    case "capped-empty":
      return (
        <Notice title={t("capped.title")} body={round.reason === "end" ? t("capped.shelf") : undefined}
          action={<><Btn tone="label" title={`${t("capped.newDeck")} →`} onPress={() => router.replace({ pathname: "/match/link", params: { d: freshLink(payload.filters, makeSeed()) } })} /><Btn title={t("deck.loosen")} onPress={loosen} /></>} />
      );
  }
}

/** Friend: the link's fixed deck, no peeking, results after the last card. */
export function Friend({ payload, name }: { payload: LinkPayload; name: string }) {
  const { lang } = usePrefs();
  useEffect(() => {
    deck.start(payload.filters, payload.seed, lang, {}, payload.version !== 1 ? { keys: payload.deck } : { limit: v1DeckSize(payload) });
  }, [payload, lang]);
  const state = useDeck();
  const left = remaining(state).length;
  const finished = state.done && !state.loading && left === 0;
  useEffect(() => { if (finished) void markVoted(payload.seed, name); }, [finished, payload.seed, name]);
  if (!finished) {
    const total = state.done ? state.cards.length : Math.max(state.cards.length, payload.deck.length);
    return <DeckView onVote={() => {}} onUndo={() => {}} onLoosen={loosen} header={<RoundCounter card={Math.min(total - left + 1, total)} of={total} />} />;
  }
  const keys = linkDeck(payload, state.cards.map((c) => c.key));
  const voters = withVoter(payload.voters, picksOf(name, keys, state.votes)); // swiping again replaces your earlier picks
  return <FriendResults payload={payload} keys={keys} voters={voters} name={name} />;
}

function FriendResults({ payload, keys, voters, name }: { payload: LinkPayload; keys: LinkPayload["deck"]; voters: LinkPayload["voters"]; name: string }) {
  const results = useLinkResults(keys, voters);
  const next = nextLink(payload, keys, voters, false);
  return (
    <ResultsView results={results} names={voterLabels(voters.map((v) => v.name))} me={voters.findIndex((v) => sameVoter(v.name, name))} onLoosen={loosen} onSwap={swap(payload)}
      sendBack={url(nextLink(payload, keys, voters, true))} addPerson={url(next)} footer={<PassPhone token={next} />} />
  );
}
