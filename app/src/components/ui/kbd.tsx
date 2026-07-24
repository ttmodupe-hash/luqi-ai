import * as React from "react"
import { cn } from "@/lib/utils"

interface KbdProps {
  children: React.ReactNode
  className?: string
}

function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100",
        className
      )}
    >
      {children}
    </kbd>
  )
}

export { Kbd }