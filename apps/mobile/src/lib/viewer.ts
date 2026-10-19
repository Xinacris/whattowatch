import * as SecureStore from "expo-secure-store";
import type { Viewer } from "@wtw/core";

const ID = "wtw.viewer.id";
const NAME = "wtw.viewer.name";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Anonymous device id + typed name. The seam for login later: same signature, different body. */
export async function getViewer(): Promise<Viewer> {
  let id = await SecureStore.getItemAsync(ID);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? uuid();
    await SecureStore.setItemAsync(ID, id);
  }
  return { id, name: (await SecureStore.getItemAsync(NAME)) ?? "" };
}

export async function setViewerName(name: string): Promise<void> {
  await SecureStore.setItemAsync(NAME, name.trim().slice(0, 40));
}
