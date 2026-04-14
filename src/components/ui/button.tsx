import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow rounded-[8px] hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm rounded-[8px] hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm rounded-[8px] hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm rounded-[8px] hover:bg-secondary/80",
        ghost:
          "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-foreground/60 rounded-[8px] hover:border-[rgba(255,255,255,0.15)] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gold:
          "bg-[var(--gold-bg)] border border-[var(--border-gold)] text-[var(--gold-primary)] font-semibold rounded-[8px] hover:bg-[var(--gold-bg-strong)]",
        "gold-solid":
          "bg-[var(--gold-primary)] text-[var(--gold-foreground,#0a0a0a)] font-bold rounded-[8px] shadow-[0_0_20px_var(--gold-bg-strong)] hover:bg-[var(--gold-bright)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[8px] px-3.5 text-xs",
        lg: "h-10 rounded-[8px] px-8",
        icon: "h-9 w-9 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "gold-solid",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
