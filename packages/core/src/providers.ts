// Where a provider chip goes. TMDB only gives one JustWatch page per title and region, so a chip opens the
// platform's own site; anything not listed falls back to that JustWatch page. Ids from TMDB's provider lists (TR, US, GB, DE).

const HOMES: [string, number[]][] = [
  ["https://www.netflix.com", [8, 175]],
  ["https://www.primevideo.com", [9, 10, 119, 613, 2100]],
  ["https://www.disneyplus.com", [337]],
  ["https://tv.apple.com", [2, 350]],
  ["https://www.hbomax.com", [1899]],
  ["https://www.youtube.com", [188, 192]],
  ["https://play.google.com/store/movies", [3]],
  ["https://mubi.com", [11]],
  ["https://www.hulu.com", [15]],
  ["https://www.paramountplus.com", [531, 2303, 2616]],
  ["https://www.peacocktv.com", [386]],
  ["https://www.crunchyroll.com", [283]],
  ["https://www.rakuten.tv", [35]],
  ["https://tubitv.com", [73]],
  ["https://www.bbc.co.uk/iplayer", [38]],
  ["https://www.channel4.com", [103]],
  ["https://www.itv.com", [41]],
  ["https://www.joyn.de", [304]],
  ["https://plus.rtl.de", [2750]],
  ["https://puhutv.com", [342]],
  ["https://tvplus.com.tr", [1904]],
  ["https://www.exxen.com", [1791]],
  ["https://www.tivibu.com.tr", [1833]],
];

const BY_ID = new Map(HOMES.flatMap(([url, ids]) => ids.map((id) => [id, url] as const)));

/** The platform's homepage, or null when we don't know it. */
export function providerHome(id: number): string | null {
  return BY_ID.get(id) ?? null;
}

/** Where a chip links: the platform, else the title's JustWatch page, else nowhere (render it as plain text). */
export function providerHref(id: number, justWatch: string | null): string | null {
  return providerHome(id) ?? justWatch;
}
