"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
}

export default function TypingAnimation({
  text,
  duration = 200,
  className,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState<string>("");

  useEffect(() => {
    setDisplayedText("");
    let index = 0;

    const typingEffect = window.setInterval(() => {
      index += 1;
      setDisplayedText(text.substring(0, index));

      if (index >= text.length) {
        window.clearInterval(typingEffect);
      }
    }, duration);

    return () => {
      window.clearInterval(typingEffect);
    };
  }, [text, duration]);

  return (
    <h1
      className={cn(
        "font-display text-center text-4xl font-bold leading-[5rem] tracking-[-0.02em] drop-shadow-sm",
        className,
      )}
    >
      {displayedText ? displayedText : text}
    </h1>
  );
}
