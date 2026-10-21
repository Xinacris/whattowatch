import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { t } from "@wtw/core";
import { colors } from "@wtw/tokens";
import { cassetteSvg } from "@wtw/tokens/logo";
import { getPrefs } from "@wtw/ui/server";

export const ogSize = { width: 1200, height: 630 };
export const ogAlt = "WhatToWatch: a VHS cassette on a dark shelf";

const anton = () => readFile(join(process.cwd(), "assets/fonts/Anton-Regular.ttf")).catch(() => null);
const mark = `data:image/svg+xml;base64,${Buffer.from(cassetteSvg).toString("base64")}`;

/**
 * The default link preview: the cassette, the name and one line of the landing headline, in the
 * visitor's language (cookie, then Accept-Language; crawlers without either get English).
 * Without the font file it still draws, in the default face, rather than failing.
 */
export async function ogImage() {
  const [{ lang }, font] = await Promise.all([getPrefs(), anton()]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 56, padding: "0 64px", background: colors.shelf, border: `2px solid ${colors.rule}`, fontFamily: "Anton" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain <img> */}
        <img src={mark} width={300} height={200} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
          <div style={{ fontSize: 112, lineHeight: 0.92, color: colors.label }}>WHATTOWATCH</div>
          <div style={{ fontSize: 40, lineHeight: 1.1, color: colors.paper, whiteSpace: "nowrap" }}>{t(lang, "landing.headline").toLocaleUpperCase(lang)}</div>
        </div>
      </div>
    ),
    { ...ogSize, fonts: font ? [{ name: "Anton", data: font, weight: 400, style: "normal" }] : [] },
  );
}
