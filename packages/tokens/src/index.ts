// Late-night video store. Dark warm shelf, one loud label colour, posters do the rest.

export const colors = {
  shelf: "#16110D", // page background, near-black brown
  shelfRaised: "#211913", // panels, cards
  shelfHigh: "#2E241B", // inputs, pressed states
  rule: "#4A3B2E", // 2px borders
  paper: "#F3E9DA", // primary text, like an old rental receipt
  paperDim: "#A8957F", // secondary text
  label: "#FFC21A", // the one loud accent: price-tag yellow
  labelInk: "#16110D", // text on the label colour
  nope: "#E4572E", // tape-orange red, reject stamp
  seen: "#8C7B68", // "seen it", deliberately dull
  ok: "#9BC53D",
} as const;

export type ColorToken = keyof typeof colors;

export const fonts = {
  display: "Anton", // condensed, heavy: titles only
  mono: "IBM Plex Mono", // labels, metadata, buttons, the spine sticker
  body: "IBM Plex Sans", // overviews and anything longer than a line
} as const;

// px. Display sizes are big on purpose; titles should feel like a shelf divider.
export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 18,
  xl: 24,
  "2xl": 32,
  "3xl": 44,
  "4xl": 64,
  "5xl": 88,
} as const;

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

// Tape cases, not app tiles: corners barely soften.
export const radius = { none: 0, sm: 2, md: 4, pill: 999 } as const;

export const border = { width: 2 } as const;

// Sticker tilt in degrees. Varies per card so a shelf never looks stamped out.
export const tilt = [-4, -2.5, 2, 3.5] as const;

export const motion = {
  // Swipe physics shared by web (CSS/pointer) and mobile (reanimated).
  commitDistance: 110, // px of drag before a release counts
  commitVelocity: 800, // px/s flick that commits regardless of distance
  rotatePerPx: 0.06, // degrees of card rotation per px dragged
  spring: { stiffness: 380, damping: 28, mass: 1 },
  flyOutMs: 220,
} as const;

/** CSS custom properties generated from the tokens above, so Tailwind reads the same source as mobile. */
export function tokensCss(): string {
  const vars = (c: Record<string, string>) => Object.entries(c).map(([k, v]) => `--wtw-${k}:${v};`).join("");
  return `:root{${vars(colors)}--wtw-border:${border.width}px;}`;
}
