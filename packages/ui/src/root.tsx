import type { Viewport } from "next";
import type { ReactNode } from "react";
import { colors, tokensCss } from "@wtw/tokens";
import type { Lang } from "@wtw/core";
import { fontVars } from "./fonts";
import { PrefsProvider } from "./prefs-client";
import { Shell } from "./shell";

export const PRODUCTION_SITE = new URL("https://whattowatchxinny.vercel.app");
/**
 * Where absolute metadata URLs (link preview images) point: this deployment on Vercel (a preview
 * shows its own image), the microfrontends proxy locally.
 */
const host = process.env.VERCEL_ENV === "production" ? null : (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL);
export const siteBase = process.env.VERCEL_ENV === "production" ? PRODUCTION_SITE : new URL(host ? `https://${host}` : "http://localhost:3024");

/** Both apps' viewport: the browser chrome in the shelf colour. Each layout exports it as `viewport`. */
export const siteViewport: Viewport = { themeColor: colors.shelf, colorScheme: "dark" };

/** The full document for either app: tokens, fonts, prefs context, header and footer. */
export function RootDocument({ lang, region, services = [], children }: { lang: Lang; region: string; services?: number[]; children: ReactNode }) {
  return (
    <html lang={lang} className={fontVars}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: tokensCss() }} />
      </head>
      <body>
        <PrefsProvider value={{ lang, region, services }}>
          <Shell lang={lang}>{children}</Shell>
        </PrefsProvider>
      </body>
    </html>
  );
}

export function Notice({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 sm:px-6">
      <p className="display text-4xl text-paper sm:text-5xl">{title}</p>
      {body && <p className="mt-4 text-paper-dim">{body}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
