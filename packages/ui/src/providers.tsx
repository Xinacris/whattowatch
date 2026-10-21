import { providerHref, t, type Lang, type Provider, type ProviderKind } from "@wtw/core";

const ORDER: ProviderKind[] = ["sub", "free", "ads", "rent", "buy"];

/** Where-to-watch, grouped by how you'd pay. Chips open the platform; the JustWatch credit closes the box. */
export function ProviderList({ providers, link, region, lang, empty }: { providers: Provider[]; link: string | null; region: string; lang: Lang; empty?: string }) {
  if (!providers.length) return <p className="text-paper-dim">{empty ?? t(lang, "title.noProviders", { region })}</p>;
  return (
    <div className="flex flex-col gap-4">
      {ORDER.map((kind) => {
        const list = providers.filter((p) => p.kind === kind);
        if (!list.length) return null;
        return (
          <div key={kind} className="flex flex-wrap items-center gap-3">
            <span className="label w-20 text-paper-dim">{t(lang, `kind.${kind}`)}</span>
            {list.map((p) => <ProviderChip key={p.id} provider={p} href={providerHref(p.id, link)} />)}
          </div>
        );
      })}
      <JustWatchCredit link={link} lang={lang} />
    </div>
  );
}

function ProviderChip({ provider: p, href }: { provider: Provider; href: string | null }) {
  const body = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny TMDB logos */}
      {p.logo && <img src={p.logo} alt="" width={28} height={28} className="size-7" />}
      <span className="label normal-case tracking-normal">{p.name}</span>
    </>
  );
  const box = "flex items-center gap-2 border-2 border-rule py-1 pr-3 pl-1";
  if (!href) return <span className={box} data-testid="provider-chip">{body}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer" title={p.name} className={`${box} hover:border-label`} data-testid="provider-chip">{body}</a>;
}

/** TMDB's terms: provider data is credited to JustWatch. A quiet link to every option when there's a page, plain text when not. */
export function JustWatchCredit({ link, lang, className = "" }: { link: string | null | undefined; lang: Lang; className?: string }) {
  const style = `label text-[11px] tracking-normal text-paper-dim ${className}`;
  if (!link) return <p className={style} data-testid="justwatch-credit">{t(lang, "providers.data")}</p>;
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={`${style} self-start underline-offset-4 hover:underline focus-visible:underline`} data-testid="justwatch-link">
      {t(lang, "providers.allOptions")} ↗
    </a>
  );
}

/** The spine sticker: 1999 · MOVIE · 2H 19M · 8.4 */
export function TapeMeta({ parts }: { parts: (string | number | null | undefined)[] }) {
  return <p className="label text-paper-dim">{parts.filter((p) => p !== null && p !== undefined && p !== "").join("  ·  ")}</p>;
}
