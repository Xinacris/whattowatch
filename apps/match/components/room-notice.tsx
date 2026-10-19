"use client";
import Link from "next/link";
import { Notice, useT } from "@wtw/ui";
import type { RoomError } from "@/lib/api";

const COPY = { not_found: "room.notFound", bad_code: "room.notFound", expired: "room.expired", full: "room.full", live_unavailable: "setup.liveDown", network: "room.offline" } as const;

export function RoomNotice({ reason }: { reason: RoomError }) {
  const t = useT();
  return <Notice title={t(COPY[reason])} action={<Link href="/match/new" className="btn btn-label">{t("landing.start")} →</Link>} />;
}
