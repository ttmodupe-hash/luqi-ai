import * as React from "react"
import { cn } from "@/lib/utils"

interface FieldProps {
  label?: string
  error?: string
  children: React.ReactNode
  className?: string
}

function Field({ label, error, children, className }: FieldProps) {
  return (
    <div data-slot="field" className={cn("grid gap-2", className)}>
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

export { Field }