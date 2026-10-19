import Link from "next/link";
import { t } from "@wtw/core";
import { Notice } from "@wtw/ui";
import { getPrefs } from "@wtw/ui/server";

export default async function NotFound() {
  const { lang } = await getPrefs();
  return <Notice title={t(lang, "title.notFound")} action={<Link href="/" className="btn btn-ghost">{t(lang, "common.back")}</Link>} />;
}
