import * as SecureStore from "expo-secure-store";
import { linkEntryKeys } from "@wtw/core";

// This person already swiped this deck on this phone: their own link opens to "waiting", not a second
// deck. Kept per person (seed + name, same core keys as the web), so two people on one phone can both vote.

/** `owner` = the name this phone remembered before; only they inherit a marker stored under the old seed-only key. */
export async function votedHere(seed: string, name: string, owner: string): Promise<boolean> {
  try {
    const { key, legacy } = linkEntryKeys("voted", seed, name, owner);
    if ((await SecureStore.getItemAsync(key)) === "1") return true;
    if (!legacy || (await SecureStore.getItemAsync(legacy)) !== "1") return false;
    await SecureStore.setItemAsync(key, "1");
    await SecureStore.deleteItemAsync(legacy);
    return true;
  } catch { return false; }
}

export async function markVoted(seed: string, name: string): Promise<void> {
  try { await SecureStore.setItemAsync(linkEntryKeys("voted", seed, name, "").key, "1"); } catch { /* the link itself still carries the votes */ }
}

/** "Swipe again as …" */
export async function forgetVote(seed: string, name: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(linkEntryKeys("voted", seed, name, "").key); } catch { /* nothing stored */ }
}
