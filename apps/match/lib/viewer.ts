"use client";
import type { Viewer } from "@wtw/core";

const ID_KEY = "wtw.viewer.id";
const NAME_KEY = "wtw.viewer.name";

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: identity lasts for the tab */ }
}

let memoryId: string | null = null;

/**
 * Who's holding the phone. Today: an anonymous device id plus a typed name.
 * This is the seam for login later; swap the body, keep the signature.
 */
export function getViewer(): Viewer {
  let id = read(ID_KEY) ?? memoryId;
  if (!id) {
    id = crypto.randomUUID();
    write(ID_KEY, id);
  }
  memoryId = id;
  return { id, name: read(NAME_KEY) ?? "" };
}

export function setViewerName(name: string) {
  write(NAME_KEY, name.trim().slice(0, 40));
}
