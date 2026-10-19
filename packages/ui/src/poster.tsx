import { t, type Lang } from "@wtw/core";

interface PosterProps { src: string | null; title: string; lang: Lang; className?: string; eager?: boolean }

/**
 * Poster with a designed fallback: a blank tape case with the title hand-lettered on the spine,
 * because a broken image icon is the opposite of a video store.
 */
export function Poster({ src, title, lang, className = "", eager = false }: PosterProps) {
  if (!src) {
    return (
      <div className={`relative flex aspect-[2/3] flex-col justify-between overflow-hidden border-2 border-rule bg-shelf-high p-3 ${className}`}>
        <div className="absolute inset-y-0 right-3 w-3 bg-[repeating-linear-gradient(0deg,var(--wtw-rule)_0_6px,transparent_6px_12px)]" aria-hidden />
        <span className="label text-seen">{t(lang, "common.noPoster")}</span>
        <span className="display line-clamp-4 pr-6 text-2xl break-words text-paper">{title}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- TMDB already serves sized images; no optimizer quota needed
    <img src={src} alt={title} draggable={false} loading={eager ? "eager" : "lazy"} className={`aspect-[2/3] w-full border-2 border-rule bg-shelf-high object-cover ${className}`} />
  );
}
