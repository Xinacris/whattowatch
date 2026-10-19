import { useEffect, useState } from "react";
import { ScrollView, Text } from "react-native";
import { router } from "expo-router";
import { encodeLink, formatRuntime, GENRES, genreName, makeSeed, MAX_GENRES, sanitizeFilters, type Era, type Kind, type Provider } from "@wtw/core";
import { Btn, Chip, Field, Section } from "@/components/ui";
import { api } from "@/lib/api";
import { usePrefs } from "@/lib/prefs";
import { colors, fontSize, s } from "@/lib/theme";
import { getViewer, setViewerName } from "@/lib/viewer";

const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function Setup() {
  const { t, lang, region } = usePrefs();
  const [live, setLive] = useState(false);
  const [mode, setMode] = useState<"live" | "link">("link");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [kind, setKind] = useState<Kind>("movie");
  const [services, setServices] = useState<number[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [runtime, setRuntime] = useState(0);
  const [era, setEra] = useState<Era>("any");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getViewer().then((v) => setName(v.name));
    api.status().then((st) => { setLive(st.live); if (st.live) setMode("live"); }, () => {});
    api.providers(region, lang).then((r) => setProviders(r.providers.filter((p) => !/channel/i.test(p.name)).slice(0, 18)), () => {});
  }, [region, lang]);

  async function go() {
    if (!name.trim()) { setError(t("setup.nameMissing")); return; }
    await setViewerName(name);
    const filters = sanitizeFilters({ kind, providers: services, genres, maxRuntime: runtime || null, era, region });
    if (mode === "link") { router.push({ pathname: "/match/link", params: { d: encodeLink({ filters, seed: makeSeed(), voters: [] }) } }); return; }
    setBusy(true);
    try {
      const room = await api.createRoom(await getViewer(), filters);
      router.replace({ pathname: "/match/[code]", params: { code: room.code } });
    } catch {
      setError(t("setup.liveDown")); setMode("link");
    } finally { setBusy(false); }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={[s.display, { fontSize: fontSize["3xl"] }]}>{t("setup.title")}</Text>
      <Section title={t("setup.mode")} hint={live ? (mode === "live" ? t("setup.mode.liveHint") : t("setup.mode.linkHint")) : t("setup.liveDown")}>
        {live && <Chip label={t("setup.mode.live")} on={mode === "live"} onPress={() => setMode("live")} />}
        <Chip label={t("setup.mode.link")} on={mode === "link"} onPress={() => setMode("link")} />
      </Section>
      <Section title={t("setup.what")}>
        {(["movie", "tv", "both"] as const).map((k) => <Chip key={k} label={t(`setup.kind.${k}`)} on={kind === k} onPress={() => setKind(k)} />)}
      </Section>
      <Section title={t("setup.services")} hint={providers.length ? t("setup.servicesHint") : t("setup.noServices", { region })}>
        {providers.map((p) => <Chip key={p.id} label={p.name} on={services.includes(p.id)} onPress={() => setServices(flip(services, p.id))} />)}
      </Section>
      <Section title={t("setup.genres")}>
        <Chip label={t("setup.anything")} on={!genres.length} onPress={() => setGenres([])} />
        {GENRES.map((g) => <Chip key={g.slug} label={genreName(lang, g.slug)} on={genres.includes(g.slug)} disabled={!genres.includes(g.slug) && genres.length >= MAX_GENRES} onPress={() => setGenres(flip(genres, g.slug))} />)}
      </Section>
      <Section title={t("setup.runtime")}>
        {[0, 90, 120, 150].map((m) => <Chip key={m} label={m ? t("setup.runtime.under", { t: formatRuntime(m) ?? "" }) : t("setup.runtime.none")} on={runtime === m} onPress={() => setRuntime(m)} />)}
      </Section>
      <Section title={t("setup.era")}>
        {(["new", "classic", "any"] as const).map((e) => <Chip key={e} label={t(`setup.era.${e}`)} on={era === e} onPress={() => setEra(e)} />)}
      </Section>
      <Section title={t("setup.name")}><Field value={name} onChangeText={(v) => { setName(v); setError(null); }} placeholder={t("setup.namePlaceholder")} /></Section>
      {error && <Text style={[s.body, { color: colors.nope }]}>{error}</Text>}
      <Btn tone="label" disabled={busy} title={busy ? t("setup.creating") : mode === "live" ? t("setup.create") : t("setup.createLink")} onPress={() => void go()} />
    </ScrollView>
  );
}
