import * as React from "react"
import { cn } from "@/lib/utils"

interface ItemProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

function Item({ children, className, onClick }: ItemProps) {
  return (
    <div
      data-slot="item"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
    >
      {children}
    </div>
  )
}

interface ItemTextProps {
  children: React.ReactNode
  className?: string
}

function ItemText({ children, className }: ItemTextProps) {
  return (
    <span data-slot="item-text" className={cn("flex-1", className)}>
      {children}
    </span>
  )
}

interface ItemIconProps {
  children: React.ReactNode
  className?: string
}

function ItemIcon({ children, className }: ItemIconProps) {
  return (
    <span
      data-slot="item-icon"
      className={cn("flex h-4 w-4 items-center justify-center text-muted-foreground", className)}
    >
      {children}
    </span>
  )
}

export { Item, ItemText, ItemIcon }