import * as React from "react"
import { cn } from "@/lib/utils"

interface InputGroupProps {
  children: React.ReactNode
  className?: string
}

function InputGroup({ children, className }: InputGroupProps) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "relative flex w-full items-center overflow-hidden rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors focus-within:ring-1 focus-within:ring-ring",
        className
      )}
    >
      {children}
    </div>
  )
}

interface InputGroupTextProps {
  children: React.ReactNode
  className?: string
}

function InputGroupText({ children, className }: InputGroupTextProps) {
  return (
    <div
      data-slot="input-group-text"
      className={cn(
        "flex items-center justify-center border-r bg-muted px-3 py-2 text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  )
}

interface InputGroupInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        data-slot="input-group-input"
        className={cn(
          "flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
InputGroupInput.displayName = "InputGroupInput"

export { InputGroup, InputGroupText, InputGroupInput }