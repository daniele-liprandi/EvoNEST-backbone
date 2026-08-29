"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const THEME_LIST = [
  { id: "evonest", label: "EvoNEST", note: "Warm paper", swatch: "#fffdfb", ink: "#d68500" },
  { id: "sepia", label: "Sepia", note: "Parchment", swatch: "#efe6d3", ink: "#d68500" },
  { id: "edge", label: "Edge", note: "Square, hard shadow", swatch: "#ffffff", ink: "#1a1410" },
  { id: "dark", label: "Dark", note: "Warm near-black", swatch: "#161310", ink: "#d68500" },
] as const;

function Swatch({ swatch, ink }: { swatch: string; ink: string }) {
  return (
    <span
      className="block size-4 shrink-0 rounded-full"
      style={{ background: swatch, boxShadow: `inset 0 0 0 1.5px ${ink}` }}
    />
  );
}

export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const current = THEME_LIST.find((t) => t.id === theme) ?? THEME_LIST[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon-sm" title={`Theme: ${current.label}`}>
          {mounted ? <Swatch swatch={current.swatch} ink={current.ink} /> : <span className="size-4" />}
          <span className="sr-only">Change theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {THEME_LIST.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => setTheme(t.id)}
            className="gap-2.5"
          >
            <Swatch swatch={t.swatch} ink={t.ink} />
            <span className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold">{t.label}</span>
              <span className="text-[11px] text-muted-foreground">{t.note}</span>
            </span>
            {mounted && t.id === theme && <Check className="ml-auto size-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
