import * as React from "react"

import { cn } from "@/lib/utils"

interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
}

function ButtonGroup({ children, className }: ButtonGroupProps) {
  return (
    <div
      data-slot="button-group"
      className={cn(
        "inline-flex items-center rounded-md border overflow-hidden",
        className
      )}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child
        return (
          <div
            key={index}
            className="border-r last:border-r-0"
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}

export { ButtonGroup }