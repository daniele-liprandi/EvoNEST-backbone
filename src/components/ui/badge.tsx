import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-destructive-foreground focus-visible:ring-destructive/20 [a&]:hover:bg-destructive/90",
        outline: "border-border text-foreground [a&]:hover:bg-muted [a&]:hover:text-foreground",
        green: "bg-green text-green-foreground",
        red: "bg-red text-red-foreground",
        yellow: "bg-yellow text-yellow-foreground",
        blue: "bg-blue text-blue-foreground",
        purple: "bg-purple text-purple-foreground",
        pink: "bg-pink text-pink-foreground",
        teal: "bg-teal text-teal-foreground",
        cyan: "bg-cyan text-cyan-foreground",
        orange: "bg-orange text-orange-foreground",
        brown: "bg-brown text-brown-foreground",
        gray: "bg-gray text-gray-foreground",
        black: "bg-black text-black-foreground",
        dark: "bg-black text-black-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }

function Badge({ className, variant = "default", asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants, type BadgeProps }
