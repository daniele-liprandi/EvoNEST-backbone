import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        green: "border-transparent bg-green text-green-foreground",
        red: "border-transparent bg-red text-red-foreground",
        yellow: "border-transparent bg-yellow text-yellow-foreground",
        blue: "border-transparent bg-blue text-blue-foreground",
        purple: "border-transparent bg-purple text-purple-foreground",
        pink: "border-transparent bg-pink text-pink-foreground",
        teal: "border-transparent bg-teal text-teal-foreground",
        gray: "border-transparent bg-gray text-gray-foreground",
        dark: "border-transparent bg-dark text-dark-foreground",
        orange: "border-transparent bg-orange text-orange-foreground",
        brown: "border-transparent bg-brown text-brown-foreground",
        black: "border-transparent bg-black text-black-foreground",
        cyan: "border-transparent bg-cyan text-cyan-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
