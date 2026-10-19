"use client";
import { Notice, useT } from "@wtw/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useT();
  return <Notice title={t("common.error")} action={<button className="btn btn-label" onClick={reset}>{t("common.retry")}</button>} />;
}
