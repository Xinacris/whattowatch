import { parseTitleKey, titleKey, type MediaType, type TitleKey } from "./tmdb/models";

// What a deck or a results list holds: a single title ("m603", "t1396") or a whole film series ("c:119").

export type CollectionKey = `c:${number}`;
export type ItemKey = TitleKey | CollectionKey;
export type ItemKind = MediaType | "collection";

export const collectionKey = (id: number): CollectionKey => `c:${id}`;

export function itemKey(kind: ItemKind, id: number): ItemKey {
  return kind === "collection" ? collectionKey(id) : titleKey(kind, id);
}

export function parseItemKey(key: string): { kind: ItemKind; id: number } | null {
  const c = /^c:(\d+)$/.exec(key);
  if (c) return { kind: "collection", id: Number(c[1]) };
  const t = parseTitleKey(key);
  return t ? { kind: t.type, id: t.id } : null;
}

export const isCollectionKey = (key: string): key is CollectionKey => /^c:\d+$/.test(key);

/** Where an item's page lives on the web. */
export function itemHref(key: ItemKey): string {
  const p = parseItemKey(key);
  if (!p) return "/";
  return p.kind === "collection" ? `/collection/${p.id}` : `/title/${p.kind}/${p.id}`;
}
