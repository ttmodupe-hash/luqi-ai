// =====================================================================
// INTELLIGENT UI ENGINE — ChatGPT-6 & Google AI Studio Dynamic Widgets
// =====================================================================

import React, { useState, useMemo } from "react";
import { Calculator, BarChart3, MapPin, ZoomIn, ZoomOut, ExternalLink } from "lucide-react";

// ─── 1. SECURE INTERACTIVE CALCULATOR ─────────────────────────────────
export interface CalculatorProps {
  baseFormula?: string;
  label?: string;
  initialX?: number;
  variableName?: string;
  unit?: string;
}

export const InteractiveCalculator: React.FC<CalculatorProps> = ({
  baseFormula = "x * 0.15",
  label = "Tax / Formula Computation",
  initialX = 100,
  variableName = "Input (x)",
  unit = "",
}) => {
  const [inputValue, setInputValue] = useState<number>(initialX);

  const result = useMemo(() => {
    try {
      const sanitized = baseFormula
        .replace(/x/g, String(inputValue))
        .replace(/X/g, String(inputValue))
        .replace(/\^/g, "**");

      if (!/^[\d\s+\-*/%().,eEMath.sqrtpowabsfloorceilroundsincoPItan]+$/.test(sanitized)) {
        return "Invalid Formula";
      }

      const calc = new Function(`"use strict"; return (${sanitized});`)();
      if (typeof calc === "number" && !isNaN(calc)) {
        return Number.isInteger(calc) ? calc : Number(calc.toFixed(4));
      }
      return "0";
    } catch {
      return "Error";
    }
  }, [inputValue, baseFormula]);

  return (
    <div className="my-3 p-4 rounded-2xl border border-amber-500/30 bg-slate-900/90 text-slate-100 shadow-xl max-w-sm backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-amber-300 text-xs tracking-wide">
            {label}
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
          {baseFormula}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-slate-300 font-medium mb-1">
            <span>{variableName}:</span>
            <span className="font-mono text-amber-400 font-bold">{inputValue} {unit}</span>
          </div>
          <input
            type="range"
            min={Math.min(0, inputValue * 2)}
            max={Math.max(1000, inputValue * 3)}
            step={1}
            value={inputValue}
            onChange={(e) => setInputValue(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between items-center mt-2">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(Number(e.target.value))}
              className="w-28 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setInputValue((v) => Math.round(v * 0.5))}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                0.5x
              </button>
              <button
                type="button"
                onClick={() => setInputValue((v) => Math.round(v * 2))}
                className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                2x
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">Computed Output:</span>
          <span className="text-sm font-bold font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {result} {unit}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── 2. INTERACTIVE VISUAL CHART ──────────────────────────────────────
export interface ChartData {
  labels: string[];
  values: number[];
}

export const IntelligentChart: React.FC<{ data: ChartData; label: string; unit?: string }> = ({
  data,
  label,
  unit = "",
}) => {
  const maxVal = Math.max(...data.values, 1);

  return (
    <div className="my-3 p-4 rounded-2xl bg-slate-900 border border-teal-500/30 text-white shadow-xl max-w-md">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider">{label}</h4>
        </div>
        <span className="text-[10px] font-mono text-slate-400">Peak: {maxVal} {unit}</span>
      </div>

      <div className="flex items-end gap-2.5 h-36 pt-4 px-1">
        {data.values.map((val, idx) => {
          const heightPercent = Math.max(8, (val / maxVal) * 100);
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
              <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-teal-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-700 shadow-md pointer-events-none whitespace-nowrap z-10">
                {val} {unit}
              </div>
              <div
                style={{ height: `${heightPercent}%` }}
                className="w-full bg-gradient-to-t from-teal-600 via-teal-400 to-cyan-300 rounded-t-lg transition-all duration-300 group-hover:brightness-125 shadow-sm"
              />
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-full text-center">
                {data.labels[idx] || `#${idx + 1}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── 3. GEOSPATIAL MAPS INTEGRATION ───────────────────────────────────
export interface MapConfig {
  latitude: number;
  longitude: number;
  zoom?: number;
}

export const IntelligentMap: React.FC<{ config: MapConfig; label: string }> = ({ config, label }) => {
  const [currentZoom, setCurrentZoom] = useState(config.zoom || 11);
  const embedUrl = `https://maps.google.com/maps?q=${config.latitude},${config.longitude}&z=${currentZoom}&output=embed`;

  return (
    <div className="my-3 p-4 bg-slate-900 border border-sky-500/30 shadow-xl rounded-2xl max-w-md overflow-hidden text-slate-100">
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold text-sky-300">{label}</h4>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentZoom((z) => Math.min(19, z + 1))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => setCurrentZoom((z) => Math.max(3, z - 1))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <a
            href={`https://www.google.com/maps?q=${config.latitude},${config.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400"
            title="Open in Google Maps"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
        <iframe
          title={label}
          width="100%"
          height="100%"
          src={embedUrl}
          className="grayscale contrast-125 brightness-90 hover:grayscale-0 transition-all duration-500"
          loading="lazy"
        />
        <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur text-[10px] font-mono px-2 py-0.5 rounded border border-slate-800 text-slate-300">
          {config.latitude.toFixed(4)}, {config.longitude.toFixed(4)}
        </div>
      </div>
    </div>
  );
};

// ─── 4. PARSER HELPERS OUTSIDE COMPONENT ─────────────────────────────
interface ParsedStructuredOutput {
  conversationalText?: string;
  uiWidgets?: any[];
}

function tryParseStructuredJson(text?: string | null): ParsedStructuredOutput | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.includes('"uiWidgets"')) return null;
  try {
    const data = JSON.parse(trimmed);
    if (data && (data.conversationalText || data.uiWidgets)) {
      return data;
    }
  } catch {
    // not valid JSON
  }
  return null;
}

function parseCalculatorTag(segment: string) {
  const formulaMatch = segment.match(/baseFormula="([^"]+)"/);
  const labelMatch = segment.match(/label="([^"]+)"/);
  const initialXMatch = segment.match(/initialX="([^"]+)"/);
  const unitMatch = segment.match(/unit="([^"]+)"/);
  const variableMatch = segment.match(/variableName="([^"]+)"/);
  return {
    baseFormula: formulaMatch ? formulaMatch[1] : "x * 0.15",
    label: labelMatch ? labelMatch[1] : "Computation Widget",
    initialX: initialXMatch ? Number(initialXMatch[1]) : 100,
    unit: unitMatch ? unitMatch[1] : "",
    variableName: variableMatch ? variableMatch[1] : "Input (x)",
  };
}

function parseChartTag(segment: string) {
  const labelsMatch = segment.match(/labels="([^"]+)"/);
  const valuesMatch = segment.match(/values="([^"]+)"/);
  const labelMatch = segment.match(/label="([^"]+)"/);
  const unitMatch = segment.match(/unit="([^"]+)"/);
  return {
    labels: labelsMatch ? labelsMatch[1].split(",").map((s) => s.trim()) : ["A", "B", "C"],
    values: valuesMatch ? valuesMatch[1].split(",").map((v) => Number(v.trim())) : [10, 20, 30],
    label: labelMatch ? labelMatch[1] : "Data Visualization",
    unit: unitMatch ? unitMatch[1] : "",
  };
}

function parseMapTag(segment: string) {
  const latMatch = segment.match(/latitude="([^"]+)"/);
  const lngMatch = segment.match(/longitude="([^"]+)"/);
  const zoomMatch = segment.match(/zoom="([^"]+)"/);
  const labelMatch = segment.match(/label="([^"]+)"/);
  return {
    latitude: latMatch ? Number(latMatch[1]) : 0,
    longitude: lngMatch ? Number(lngMatch[1]) : 0,
    zoom: zoomMatch ? Number(zoomMatch[1]) : 10,
    label: labelMatch ? labelMatch[1] : "Geospatial Location",
  };
}

// ─── 5. PROGRESSIVE STREAMING AST PARSER ─────────────────────────────
interface StreamRendererProps {
  rawStreamText?: string;
  content?: string;
}

export const IntelligentUIStreamRenderer: React.FC<StreamRendererProps> = ({ rawStreamText, content }) => {
  const text = (rawStreamText ?? content ?? "") || "";
  const jsonOutput = tryParseStructuredJson(text);

  if (jsonOutput) {
    return (
      <div className="space-y-3">
        {jsonOutput.conversationalText && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
            {jsonOutput.conversationalText}
          </div>
        )}
        {Array.isArray(jsonOutput.uiWidgets) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {jsonOutput.uiWidgets.map((w: any, idx: number) => {
              if (w.type === "calculator") {
                return (
                  <InteractiveCalculator
                    key={idx}
                    baseFormula={w.baseFormula || w.formula}
                    label={w.label}
                    initialX={w.initialX || 100}
                    variableName={w.variableName}
                    unit={w.unit}
                  />
                );
              }
              if (w.type === "chart" && w.chartData) {
                return (
                  <IntelligentChart
                    key={idx}
                    data={w.chartData}
                    label={w.label}
                    unit={w.unit}
                  />
                );
              }
              if (w.type === "map" && w.mapConfig) {
                return (
                  <IntelligentMap
                    key={idx}
                    config={w.mapConfig}
                    label={w.label}
                  />
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    );
  }

  // Tag parsing for <Calculator />, <Chart />, and <Map />
  const widgetRegex = /(<(?:Calculator|Chart|Map)\s+[^>]*\/>)/g;
  const segments = text.split(widgetRegex);

  return (
    <div className="space-y-2">
      {segments.map((segment, index) => {
        if (segment.startsWith("<Calculator")) {
          const p = parseCalculatorTag(segment);
          return (
            <InteractiveCalculator
              key={`calc-${index}`}
              baseFormula={p.baseFormula}
              label={p.label}
              initialX={p.initialX}
              unit={p.unit}
              variableName={p.variableName}
            />
          );
        }

        if (segment.startsWith("<Chart")) {
          const p = parseChartTag(segment);
          return (
            <IntelligentChart
              key={`chart-${index}`}
              data={{ labels: p.labels, values: p.values }}
              label={p.label}
              unit={p.unit}
            />
          );
        }

        if (segment.startsWith("<Map")) {
          const p = parseMapTag(segment);
          return (
            <IntelligentMap
              key={`map-${index}`}
              config={{
                latitude: p.latitude,
                longitude: p.longitude,
                zoom: p.zoom,
              }}
              label={p.label}
            />
          );
        }

        return (
          <span key={index} className="whitespace-pre-wrap text-sm leading-relaxed">
            {segment}
          </span>
        );
      })}
    </div>
  );
};
