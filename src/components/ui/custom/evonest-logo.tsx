"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface EvoNestLogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  priority?: boolean;
  outline?: boolean;
}

export function EvoNestLogo({
  size = "md",
  className = "",
  priority = false,
  outline = false,
}: EvoNestLogoProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Define size classes
  const sizeClasses = {
    icon: "w-5 h-5",    // 20px
    sm: "w-6 h-6",      // 24px
    md: "w-12 h-12",    // 48px  
    lg: "w-16 h-16",    // 64px
    xl: "w-24 h-24",    // 96px
    "2xl": "w-32 h-32", // 128px
  };

  const logoClasses = `${sizeClasses[size]} ${className}`;

  if (!mounted) {
    // Return a placeholder with the same dimensions to prevent layout shift
    return (
      <div className={`flex items-center justify-center ${logoClasses}`}>
        <span className="text-xs font-bold">EN</span>
      </div>
    );
  }

  // Determine which logo to show based on the current theme
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";
  const isOutline = outline;
  return (
    <>
      {/* Light theme logo */}
      <Image
        src="/EvoNESTlogo.svg"
        alt="EvoNEST Logo"
        width={128}
        height={128}
        className={`${logoClasses} ${!isDark && !isOutline ? "block" : "hidden"}`}
        priority={priority}
      />
      {/* Dark theme logo */}
      <Image
        src="/EvoNESTlogo_dark.svg"
        alt="EvoNEST Logo"
        width={128}
        height={128}
        className={`${logoClasses} ${isDark && !isOutline ? "block" : "hidden"}`}
        priority={priority}
      />      {/* Outline light theme logo */}
      <Image
        src="/EvoNESTlogo_outline.svg"
        alt="EvoNEST Logo"
        width={128}
        height={128}
        className={`${logoClasses} ${isOutline && !isDark ? "block" : "hidden"}`}
        priority={priority}
      />
      {/* Outline dark theme logo */}
      <Image
        src="/EvoNESTlogo_outline_dark.svg"
        alt="EvoNEST Logo"
        width={128}
        height={128}
        className={`${logoClasses} ${isOutline && isDark ? "block" : "hidden"}`}
        priority={priority}
      />
    </>
  );
}
