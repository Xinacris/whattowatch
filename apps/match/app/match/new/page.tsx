import type { Metadata } from "next";
import { providersInRegion, t } from "@wtw/core";
import { getPrefs, tmdb } from "@wtw/ui/server";
import { SetupForm } from "@/components/client-only";
import { getRoomStore } from "@/lib/store";

export const metadata: Metadata = { title: "New movie night" };

async function providers(region: string, tl: string) {
  try {
    // Resold "channels" (Amazon Channel, Apple TV channel) are noise here: people know what app they open.
    const all = await providersInRegion(tmdb(), region, tl);
    return all.filter((p) => !/channel/i.test(p.name)).slice(0, 18).map(({ id, name, logo }) => ({ id, name, logo }));
  } catch {
    return []; // region without data, or TMDB down: setup still works, just without the service filter
  }
}

export default async function NewNight() {
  const { lang, region, tmdbLang } = await getPrefs();
  const list = await providers(region, tmdbLang);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="label text-label">{region}</p>
      <h1 className="display mt-2 text-6xl">{t(lang, "setup.title")}</h1>
      <div className="mt-10">
        <SetupForm key={region} providers={list} liveAvailable={getRoomStore() !== null} />
      </div>
    </div>
  );
}
