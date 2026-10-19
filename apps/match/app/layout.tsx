import type { Metadata } from "next";
import { RootDocument } from "@wtw/ui";
import { getPrefs } from "@wtw/ui/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Movie night · WhatToWatch", template: "%s · WhatToWatch" },
  description: "Everyone swipes the same stack. First thing you all say yes to, you watch.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, region, services } = await getPrefs();
  return <RootDocument lang={lang} region={region} services={services}>{children}</RootDocument>;
}
