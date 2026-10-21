import type { Metadata } from "next";
import { PRODUCTION_SITE, RootDocument, siteBase, siteViewport } from "@wtw/ui";
import { getPrefs } from "@wtw/ui/server";
import "./globals.css";

export const metadata: Metadata = {
  // The preview image is the web app's. A match deployment's own URL doesn't serve it, so on Vercel
  // point at the site; locally the proxy serves both. A shared room or link shows the cassette too.
  metadataBase: process.env.VERCEL ? PRODUCTION_SITE : siteBase,
  openGraph: { images: [{ url: "/opengraph-image", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", images: ["/twitter-image"] },
  title: { default: "Movie night · WhatToWatch", template: "%s · WhatToWatch" },
  description: "Swipe the same stack. Watch what you all liked.",
};

export const viewport = siteViewport;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, region, services } = await getPrefs();
  return <RootDocument lang={lang} region={region} services={services}>{children}</RootDocument>;
}
