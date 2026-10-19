import Link from "next/link";
import type { Metadata } from "next";
import { decodeLink, t } from "@wtw/core";
import { Notice } from "@wtw/ui";
import { getPrefs } from "@wtw/ui/server";
import { LinkRoom } from "@/components/client-only";

export const metadata: Metadata = { title: "Movie night", robots: { index: false } };

export default async function LinkPage({ searchParams }: PageProps<"/match/link">) {
  const { d } = await searchParams;
  const payload = typeof d === "string" ? decodeLink(d) : null;
  if (!payload) {
    const { lang } = await getPrefs();
    return <Notice title={t(lang, "link.broken")} action={<Link href="/match/new" className="btn btn-label">{t(lang, "landing.start")} →</Link>} />;
  }
  return <LinkRoom payload={payload} />;
}
