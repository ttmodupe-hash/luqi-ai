import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyProps {
  className?: string
  description?: string
  children?: React.ReactNode
}

function Empty({ className, description = "No data", children }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center text-muted-foreground",
        className
      )}
    >
      <p className="text-sm">{description}</p>
      {children}
    </div>
  )
}

export { Empty }