"use client";

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { ArrowRight } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface NavCardProps {
  href: string;
  title: string;
  description?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  className?: string;
}

/**
 * Link tile for the section landing pages (samples, experiments). The hover and
 * focus treatment is driven by theme tokens so it follows the active theme
 * instead of the fixed orange glow the pages used to hard-code.
 */
export function NavCard({ href, title, description, icon: Icon, className }: NavCardProps) {
  return (
    <Link href={href} className="group block h-full focus-visible:outline-none">
      <Card
        className={cn(
          "flex h-full items-start justify-between gap-3 p-6 transition-colors",
          "group-hover:border-primary/40 group-hover:bg-muted/50",
          "group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50",
          className,
        )}
      >
        <div className="space-y-1.5">
          <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {Icon ? (
          <Icon className="size-5 shrink-0 text-muted-foreground" />
        ) : (
          <ArrowRight className="mt-0.5 size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        )}
      </Card>
    </Link>
  );
}
