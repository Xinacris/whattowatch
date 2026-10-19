"use client";
import { useState } from "react";
import { normalizeRoomCode } from "@wtw/core";
import { useT } from "@wtw/ui";

export function JoinForm() {
  const t = useT();
  const [value, setValue] = useState("");
  const [bad, setBad] = useState(false);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const code = normalizeRoomCode(value);
        if (!code) { setBad(true); return; }
        // /match is another zone (microfrontend), so this is a full navigation on purpose.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/match/${code}`);
      }}
    >
      <label htmlFor="join-code" className="label text-paper-dim">{t("landing.joinLabel")}</label>
      <div className="flex">
        <input
          id="join-code"
          className="field w-40 uppercase tracking-[0.3em]"
          value={value}
          maxLength={8}
          autoComplete="off"
          spellCheck={false}
          placeholder="K7RQ2M"
          aria-invalid={bad}
          onChange={(e) => { setValue(e.target.value); setBad(false); }}
        />
        <button type="submit" className="btn btn-ghost -ml-[2px]">{t("landing.join")}</button>
      </div>
      {bad && <p role="alert" className="label normal-case tracking-normal text-nope">{t("landing.badCode")}</p>}
    </form>
  );
}
