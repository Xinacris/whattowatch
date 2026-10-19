"use client";
import type { ReactNode } from "react";

export function Field({ legend, hint, children }: { legend: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="border-t-2 border-rule pt-5">
      <legend className="display float-left mb-3 w-full text-2xl">{legend}</legend>
      {hint && <p className="clear-both mb-3 text-sm text-paper-dim">{hint}</p>}
      <div className="clear-both flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

/** Radio-like single choice rendered as tape-label chips. */
export function Choice<T extends string | number>({ options, value, onChange, name }: { options: readonly { value: NoInfer<T>; label: string }[]; value: T; onChange(v: NoInfer<T>): void; name: string }) {
  return options.map((o) => (
    <label key={String(o.value)} className="chip">
      <input type="radio" name={name} className="sr-only" checked={o.value === value} onChange={() => onChange(o.value)} />
      {o.label}
    </label>
  ));
}

export function Toggle({ checked, onChange, children, disabled }: { checked: boolean; onChange(v: boolean): void; children: ReactNode; disabled?: boolean }) {
  return (
    <label className={`chip flex items-center gap-2 ${disabled ? "opacity-40" : ""}`}>
      <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}
