import type { Metadata } from "next";
import { RootDocument } from "@wtw/ui";
import { getPrefs } from "@wtw/ui/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "WhatToWatch", template: "%s · WhatToWatch" },
  description: "Swipe the same stack of movies together. The first one everybody likes, you watch.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, region, services } = await getPrefs();
  return <RootDocument lang={lang} region={region} services={services}>{children}</RootDocument>;
}
