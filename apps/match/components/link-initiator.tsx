"use client";
import Link from "next/link";
import { freshLink, makeSeed, nextLink, picksOf, roundState, votedKeys, type LinkPayload } from "@wtw/core";
import { Notice, useT } from "@wtw/ui";
import { useDeck } from "@/lib/deck-store";
import { markVoted } from "@/lib/link-progress";
import { linkUrl } from "@/lib/share";
import { useLinkDeck } from "@/lib/use-link-deck";
import { Deck } from "./deck";
import { RoundCounter } from "./round-counter";
import { ShareScreen } from "./share-screen";

/** The person starting the night: rounds of 10, then 5, until 30% are yeses. */
export function LinkInitiator({ payload, name }: { payload: LinkPayload; name: string }) {
  const t = useT();
  useLinkDeck(payload, "initiator");
  const { cards, votes, done } = useDeck();
  const order = cards.map((c) => c.key);
  const round = roundState(votes, order, done);

  switch (round.phase) {
    case "swiping":
    case "extend":
      return (
        <Deck
          onVote={() => {}}
          onUndo={() => {}}
          banner={round.phase === "extend" ? t("round.more") : null}
          aside={<RoundCounter liked={round.liked} need={round.need} card={Math.min(round.voted + 1, round.target)} of={round.target} />}
        />
      );
    case "done": {
      const deck = votedKeys(order, votes);
      const url = linkUrl(nextLink(payload, deck, [picksOf(name, deck, votes)], false));
      const note = round.reason === "cap" ? t("share.picky") : round.reason === "end" ? t("share.shelfEnd") : null;
      const sent = () => {
        markVoted(payload.seed);
        window.history.replaceState(null, "", url); // reload now opens "waiting for your friend"
      };
      return <ShareScreen title={t("share.title", { n: round.liked })} line={note ?? t("share.line")} url={url} onShared={sent} onUndo={() => useDeck.getState().undo()} />;
    }
    case "capped-empty":
      return (
        <Notice
          title={t("capped.title")}
          body={round.reason === "end" ? t("capped.shelf") : undefined}
          action={
            <div className="flex flex-wrap gap-3">
              <a href={`/match/link?d=${freshLink(payload.filters, makeSeed())}`} className="btn btn-label">{t("capped.newDeck")} →</a>
              <Link href="/match/new" className="btn btn-ghost">{t("deck.loosen")}</Link>
            </div>
          }
        />
      );
  }
}
