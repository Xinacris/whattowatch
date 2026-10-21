import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Lang } from "@wtw/core";
import { PrefsProvider } from "@wtw/ui";
import "../app/globals.css";

let root: Root | null = null;
let host: HTMLElement | null = null;

/** Renders into a fresh container with the app's prefs. */
export async function render(ui: ReactNode, { lang = "en" as Lang, width = 1024 } = {}) {
  await unmount();
  host = document.createElement("div");
  host.style.width = `${width}px`;
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<PrefsProvider value={{ lang, region: "TR", services: [] }}>{ui}</PrefsProvider>));
  return host;
}

export async function unmount() {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = null;
  host = null;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
