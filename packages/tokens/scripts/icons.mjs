// Every WhatToWatch icon, from the one master: assets/logo.svg. `pnpm --filter @wtw/tokens icons`.
// Colours come from ../src/index.ts by name. Output is byte-identical run to run (no timestamps, no metadata).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { colors } from "../src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");
const master = await readFile(join(here, "../assets/logo.svg"), "utf8");

/** The shapes of one <g> in the master: [{ tag, attrs }], fills still token names. */
function group(id) {
  const body = master.match(new RegExp(`<g id="${id}">([\\s\\S]*?)</g>`))?.[1];
  if (!body) throw new Error(`logo.svg has no <g id="${id}">`);
  return [...body.matchAll(/<(rect|circle)\b([^>]*)\/>/g)].map(([, tag, raw]) => ({
    tag, attrs: Object.fromEntries([...raw.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v])),
  }));
}
const SHAPES = { full: group("full"), small: group("small") };
const C = 512; // every shape set is drawn around the canvas centre

const fillOf = (token) => { if (!(token in colors)) throw new Error(`unknown colour token ${token}`); return colors[token]; };
const n = (v) => Number(v);

/** A shape as path data, for the one-colour silhouette. */
function pathOf({ tag, attrs: a }) {
  if (tag === "circle") {
    const [cx, cy, r] = [n(a.cx), n(a.cy), n(a.r)];
    return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
  }
  const [x, y, w, h, r] = [n(a.x ?? 0), n(a.y ?? 0), n(a.width), n(a.height), n(a.rx ?? 0)];
  return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
}

/**
 * Body, minus window and strip, plus the reels, minus the hubs: one even-odd path. Each shape sits
 * inside the one before it, so alternating fill/hole is just nesting depth.
 */
const silhouettePath = (set) => set.map(pathOf).join("");

const scaled = (inner, scale) => (scale === 1 ? inner : `<g transform="translate(${C} ${C}) scale(${scale}) translate(${-C} ${-C})">${inner}</g>`);
const colour = (set) => set.map(({ tag, attrs }) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== "id").map(([k, v]) => `${k}="${k === "fill" ? fillOf(v) : v}"`).join(" ")}/>`).join("");
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${inner}</svg>`;
const bg = `<rect width="1024" height="1024" fill="${colors.shelf}"/>`;

/** The variants. `scale` shrinks the cassette around the centre into a platform's safe zone. */
const VARIANTS = {
  square: ({ set = "full", scale = 1 } = {}) => svg(bg + scaled(colour(SHAPES[set]), scale)), // full-bleed: background + cassette
  cassette: ({ set = "full", scale = 1 } = {}) => svg(scaled(colour(SHAPES[set]), scale)), // transparent around it
  silhouette: ({ set = "full", scale = 1 } = {}) => svg(scaled(`<path fill="#FFFFFF" fill-rule="evenodd" d="${silhouettePath(SHAPES[set])}"/>`, scale)),
};

// Safe zones, as a scale on the 1024 drawing. The cassette's farthest point (a rounded corner) is
// 405 px from the centre at scale 1.
//   Web maskable: safe circle radius 40% (409.6 px)   → 0.9 leaves a margin.
//   Android adaptive: 66 of 108 dp visible-for-sure  → radius 313 px; 0.74 puts the corners at 300.
const MASKABLE = 0.9;
const ADAPTIVE = 0.74;

const web = (app) => [
  { variant: "square", opts: { set: "small" }, out: `apps/${app}/app/icon.svg`, format: "svg" },
  { variant: "square", opts: { set: "small" }, sizes: [16, 32], out: `apps/${app}/app/favicon.ico`, format: "ico" },
  { variant: "square", size: 180, out: `apps/${app}/app/apple-icon.png`, format: "png-opaque" },
];

/** Flat on purpose: one line per file. */
const JOBS = [
  ...web("web"),
  ...web("match"),
  { variant: "square", size: 192, out: "apps/web/public/icons/icon-192.png", format: "png-opaque" },
  { variant: "square", size: 512, out: "apps/web/public/icons/icon-512.png", format: "png-opaque" },
  { variant: "square", opts: { scale: MASKABLE }, size: 512, out: "apps/web/public/icons/maskable-512.png", format: "png-opaque" },
  { variant: "square", size: 1024, out: "apps/mobile/assets/images/icon.png", format: "png-opaque" }, // iOS light + dark, Android legacy
  { variant: "silhouette", size: 1024, out: "apps/mobile/assets/images/icon-tinted.png", format: "png" }, // iOS tinted
  { variant: "cassette", opts: { scale: ADAPTIVE }, size: 1024, out: "apps/mobile/assets/images/android-foreground.png", format: "png" },
  { variant: "silhouette", opts: { scale: ADAPTIVE }, size: 1024, out: "apps/mobile/assets/images/android-monochrome.png", format: "png" },
  { variant: "cassette", size: 1024, out: "apps/mobile/assets/images/splash.png", format: "png" },
  { variant: "mark", out: "packages/tokens/src/logo.ts", format: "ts" },
  { variant: "expo", out: "apps/mobile/app.json", format: "expo" },
];

/** The icon and splash keys of the Expo config: the files above, colours from the tokens. Everything else in app.json is kept. */
async function expoConfig(path) {
  const app = JSON.parse(await readFile(path, "utf8"));
  const img = (f) => `./assets/images/${f}`;
  const e = app.expo;
  e.icon = img("icon.png");
  e.backgroundColor = colors.shelf;
  e.ios = { ...e.ios, icon: { light: img("icon.png"), dark: img("icon.png"), tinted: img("icon-tinted.png") } };
  e.android = { ...e.android, adaptiveIcon: { foregroundImage: img("android-foreground.png"), monochromeImage: img("android-monochrome.png"), backgroundColor: colors.shelf } };
  const splash = { image: img("splash.png"), imageWidth: 200, resizeMode: "contain", backgroundColor: colors.shelf };
  // No `dark` block: the app is always dark (userInterfaceStyle), so this is the dark splash, and on iOS
  // a dark block next to userInterfaceStyle stops the splash working (expo prebuild warns).
  e.plugins = e.plugins.map((p) => ((Array.isArray(p) ? p[0] : p) === "expo-splash-screen" ? ["expo-splash-screen", splash] : p));
  return `${JSON.stringify(app, null, 2)}\n`;
}

/** `opaque`: no alpha channel at all (iOS rejects one). `rgba`: alpha kept but every pixel solid (ICO decoders want RGBA). */
const png = (src, size, mode) => {
  const img = sharp(Buffer.from(src), { density: (72 * size) / 1024 }).resize(size, size);
  const flat = () => img.flatten({ background: colors.shelf });
  const out = mode === "opaque" ? flat().removeAlpha() : mode === "rgba" ? flat().ensureAlpha(1) : img.ensureAlpha();
  return out.png({ compressionLevel: 9, palette: false }).toBuffer();
};

/** ICO holding PNG images (Vista+ and every current browser read these). */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size % 256, e);
    head.writeUInt8(size % 256, e + 1);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.data)]);
}

/** The header mark: the silhouette path, cropped to the cassette, for the Logo component in @wtw/ui. */
function mark() {
  const body = SHAPES.full.find((s) => s.attrs.id === "body").attrs;
  const viewBox = [body.x, body.y, body.width, body.height].join(" ");
  const cassette = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${body.width}" height="${body.height}">${colour(SHAPES.full)}</svg>`;
  return [
    "// Generated by packages/tokens/scripts/icons.mjs from assets/logo.svg. Don't edit; run `pnpm --filter @wtw/tokens icons`.",
    "",
    "/** The cassette as one even-odd path (body minus window and strip, reels minus hubs), cropped to the body. */",
    `export const logoMark = {\n  viewBox: "${viewBox}",\n  d: "${silhouettePath(SHAPES.full)}",\n} as const;`,
    "",
    "/** The cassette in its colours on transparent, cropped to the body: for images drawn on the server (link previews). */",
    `export const cassetteSvg = ${JSON.stringify(cassette)};`,
    "",
  ].join("\n");
}

async function render({ variant, opts, size, sizes, format, out }) {
  if (format === "ts") return mark();
  if (format === "expo") return expoConfig(join(root, out));
  const src = VARIANTS[variant](opts);
  if (format === "svg") return `${src}\n`;
  if (format === "ico") return ico(await Promise.all(sizes.map(async (s) => ({ size: s, data: await png(src, s, "rgba") }))));
  return png(src, size, format === "png-opaque" ? "opaque" : "alpha");
}

for (const job of JOBS) {
  const out = join(root, job.out);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, await render(job));
  console.log(job.out);
}
