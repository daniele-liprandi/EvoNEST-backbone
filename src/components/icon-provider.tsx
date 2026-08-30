"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { IconContext } from "@phosphor-icons/react";

export function IconProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  // edge is the square, hard-shadow theme, so its icons go bold to match.
  const weight = theme === "edge" ? "bold" : "regular";

  return (
    <IconContext.Provider value={{ weight }}>{children}</IconContext.Provider>
  );
}
