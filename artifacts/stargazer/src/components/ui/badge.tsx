import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./glass-card"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/20 text-primary hover:bg-primary/30 border-primary/30",
        secondary:
          "border-transparent bg-secondary/20 text-secondary hover:bg-secondary/30 border-secondary/30",
        destructive:
          "border-transparent bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30",
        outline: "text-foreground",
        accent: "border-transparent bg-accent/20 text-accent hover:bg-accent/30 border-accent/30",
        planet: "border-transparent bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/30",
        star: "border-transparent bg-blue-400/20 text-blue-300 hover:bg-blue-400/30 border-blue-400/30",
        deepsky: "border-transparent bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-purple-500/30",
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
