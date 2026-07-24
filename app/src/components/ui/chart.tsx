"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = { config: ChartConfig }
const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error("useChart must be used within a <ChartContainer />")
  return context
}

function ChartContainer({ id, className, children, config, ...props }: React.ComponentProps<"div"> & { config: ChartConfig; children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"] }) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`
  return (
    <ChartContext.Provider value={{ config }}>
      <div data-slot="chart" data-chart={chartId} className={cn("flex aspect-video justify-center text-xs", className)} {...props}>
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, c]) => c.theme || c.color)
  if (!colorConfig.length) return null
  return (
    <style dangerouslySetInnerHTML={{ __html: Object.entries(THEMES).map(([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig.map(([key, item]) => `  --color-${key}: ${item.theme?.[theme as keyof typeof item.theme] || item.color};`).join("\n")}
}`).join("\n") }} />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({ active, payload, className, label }: React.ComponentProps<typeof RechartsPrimitive.Tooltip> & React.ComponentProps<"div">) {
  const { config } = useChart()
  if (!active || !payload?.length) return null
  return (
    <div className={cn("border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl", className)}>
      {label && <div className="font-medium">{label}</div>}
      <div className="grid gap-1.5">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex w-full items-center gap-2">
            <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto font-mono font-medium">{item.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({ payload }: React.ComponentProps<"div"> & Pick<RechartsPrimitive.LegendProps, "payload">) {
  const { config } = useChart()
  if (!payload?.length) return null
  return (
    <div className="flex items-center justify-center gap-4 pt-3">
      {payload.map((item) => (
        <div key={item.value} className="flex items-center gap-1.5">
          <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground text-xs">{config[item.dataKey as string]?.label || item.value}</span>
        </div>
      ))}
    </div>
  )
}

function getPayloadConfig(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) return undefined
  const p = payload as Record<string, unknown>
  const payloadKey = p["payload"] && typeof p["payload"] === "object" && p["payload"] !== null
    ? (p["payload"] as Record<string, unknown>)[key]
    : undefined
  return config[key] || config[String(payloadKey)]
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle }