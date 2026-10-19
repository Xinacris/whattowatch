import * as SecureStore from "expo-secure-store";

// This device already swiped this deck: your own link opens to "waiting", not a second deck.
const key = (seed: string) => `wtw.link.voted.${seed}`;

export async function votedHere(seed: string): Promise<boolean> {
  try { return (await SecureStore.getItemAsync(key(seed))) === "1"; } catch { return false; }
}

export async function markVoted(seed: string): Promise<void> {
  try { await SecureStore.setItemAsync(key(seed), "1"); } catch { /* the link itself still carries the votes */ }
}
