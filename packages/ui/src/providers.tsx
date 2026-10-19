import { t, type Lang, type Provider, type ProviderKind } from "@wtw/core";

const ORDER: ProviderKind[] = ["sub", "free", "ads", "rent", "buy"];

/** Where-to-watch, grouped by how you'd pay. Links go to TMDB's JustWatch page for the region. */
export function ProviderList({ providers, link, region, lang }: { providers: Provider[]; link: string | null; region: string; lang: Lang }) {
  if (!providers.length) return <p className="text-paper-dim">{t(lang, "title.noProviders", { region })}</p>;
  return (
    <div className="flex flex-col gap-4">
      {ORDER.map((kind) => {
        const list = providers.filter((p) => p.kind === kind);
        if (!list.length) return null;
        return (
          <div key={kind} className="flex flex-wrap items-center gap-3">
            <span className="label w-20 text-paper-dim">{t(lang, `kind.${kind}`)}</span>
            {list.map((p) => (
              <a key={p.id} href={link ?? undefined} target="_blank" rel="noreferrer" title={p.name} className="flex items-center gap-2 border-2 border-rule py-1 pr-3 pl-1 hover:border-label">
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny TMDB logos */}
                {p.logo && <img src={p.logo} alt="" width={28} height={28} className="size-7" />}
                <span className="label normal-case tracking-normal">{p.name}</span>
              </a>
            ))}
          </div>
        );
      })}
      {link && <a href={link} target="_blank" rel="noreferrer" className="label text-label underline underline-offset-4">{t(lang, "title.allOptions")} ↗</a>}
    </div>
  );
}

/** The spine sticker: 1999 · MOVIE · 2H 19M · 8.4 */
export function TapeMeta({ parts }: { parts: (string | number | null | undefined)[] }) {
  return <p className="label text-paper-dim">{parts.filter((p) => p !== null && p !== undefined && p !== "").join("  ·  ")}</p>;
}
