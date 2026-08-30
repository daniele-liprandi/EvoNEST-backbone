"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export const THEMES = [
  { id: "evonest", label: "EvoNEST", note: "warm paper" },
  { id: "sepia", label: "Sepia", note: "parchment" },
  { id: "edge", label: "Edge", note: "square, hard shadow" },
  { id: "dark", label: "Dark", note: "warm near-black" },
] as const;

// Standalone theme selector for pages with no navbar.
export function ThemeBar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const active = mounted ? theme : "evonest";

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          aria-pressed={active === t.id}
          className={cn(
            "rounded-md border px-3 py-1.5 text-left transition-colors",
            active === t.id
              ? "border-primary bg-primary/10 text-primary"
              : "border-input text-muted-foreground hover:bg-muted"
          )}
        >
          <span className="block text-sm font-medium">{t.label}</span>
          <span className="block text-xs opacity-70">{t.note}</span>
        </button>
      ))}
    </div>
  );
}

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-12 first:border-t-0">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {intro && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{intro}</p>}
      <div className="mt-6 flex flex-col gap-8">{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-6">
      <div className="pt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function Swatch({ token, value }: { token: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full rounded-md border border-border"
        style={{ background: `var(${token})` }}
      />
      <div className="font-mono text-[11px] leading-tight text-muted-foreground">
        <span className="text-foreground">{token}</span>
        {value && <span className="block">{value}</span>}
      </div>
    </div>
  );
}

export function HslSwatch({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-14 w-full rounded-md border border-border"
        style={{ background: `hsl(var(${token}))` }}
      />
      <div className="font-mono text-[11px] text-foreground">{token}</div>
    </div>
  );
}
