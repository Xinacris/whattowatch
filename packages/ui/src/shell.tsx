import type { ReactNode } from "react";
import { Link } from "@vercel/microfrontends/next/client";
import { t, type Lang } from "@wtw/core";
import { HeaderSearch } from "./header-search";
import { LangToggle, RegionSelect } from "./prefs-client";

export function Wordmark() {
  return (
    <Link href="/" className="group flex items-baseline gap-2">
      <span className="display text-2xl text-paper group-hover:text-label">WhatToWatch</span>
      <span className="sticker -rotate-3 max-sm:hidden">Open late</span>
    </Link>
  );
}

export function Header({ lang }: { lang: Lang }) {
  return (
    <header className="relative border-b-2 border-rule">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Wordmark />
        <nav className="label flex gap-5 text-paper-dim">
          <Link href="/match/new" className="hover:text-label">{t(lang, "nav.night")}</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <HeaderSearch />
          <RegionSelect />
          <LangToggle />
        </div>
      </div>
    </header>
  );
}

export function Footer({ lang }: { lang: Lang }) {
  return (
    <footer className="mt-24 border-t-2 border-rule">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- static attribution logo served by the default app */}
          <img src="/tmdb.svg" alt="TMDB" width={96} height={12} />
        </a>
        <p className="label normal-case tracking-normal text-paper-dim">{t(lang, "footer.attribution")}</p>
        <p className="label text-seen sm:ml-auto">{t(lang, "footer.note")}</p>
      </div>
    </footer>
  );
}

export function Shell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header lang={lang} />
      <main className="flex-1">{children}</main>
      <Footer lang={lang} />
    </div>
  );
}
