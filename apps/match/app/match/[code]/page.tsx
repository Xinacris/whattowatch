import Link from "next/link";
import type { Metadata } from "next";
import { normalizeRoomCode, t } from "@wtw/core";
import { Notice } from "@wtw/ui";
import { getPrefs } from "@wtw/ui/server";
import { LiveRoom } from "@/components/client-only";

export const metadata: Metadata = { title: "Room", robots: { index: false } };

export default async function RoomPage({ params }: PageProps<"/match/[code]">) {
  const code = normalizeRoomCode((await params).code);
  if (!code) {
    const { lang } = await getPrefs();
    return <Notice title={t(lang, "room.notFound")} action={<Link href="/match/new" className="btn btn-label">{t(lang, "landing.start")} →</Link>} />;
  }
  return <LiveRoom code={code} />;
}
