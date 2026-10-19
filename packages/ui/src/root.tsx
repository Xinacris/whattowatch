import type { ReactNode } from "react";
import { tokensCss } from "@wtw/tokens";
import type { Lang } from "@wtw/core";
import { fontVars } from "./fonts";
import { PrefsProvider } from "./prefs-client";
import { Shell } from "./shell";

/** The full document for either app: tokens, fonts, prefs context, header and footer. */
export function RootDocument({ lang, region, services = [], children }: { lang: Lang; region: string; services?: number[]; children: ReactNode }) {
  return (
    <html lang={lang} className={fontVars} data-theme="dark">
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
