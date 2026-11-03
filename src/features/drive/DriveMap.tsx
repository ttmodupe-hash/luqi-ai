import React, { useEffect, useRef, useState } from "react";
import { Crosshair, Maximize2, Minus, Plus } from "lucide-react";
import { stops, demoOrigin } from "./drive-navigation";
import type { Point } from "./drive-navigation";
import map from "./drive-map.json";

const cos = Math.cos((26 * Math.PI) / 180);
const region = { lon: 27.85, lat: -25.83 };
const [west, south, east, north] = map.bbox;
const inCoverage = (p: Point) =>
  p.lon >= west && p.lon <= east && p.lat >= south && p.lat <= north;
const limitScale = (n: number) => Math.min(7000, Math.max(90, n));

export default function DriveMap({
  point,
  target,
  mode,
  following,
  setFollowing,
  resetKey,
}: {
  point: (Point & { heading: number | null; accuracy?: number }) | null;
  target: (typeof stops)[number];
  mode: string;
  following: boolean;
  setFollowing: (follow: boolean) => void;
  resetKey: number;
}) {
  const frame = useRef<HTMLDivElement>(null),
    drag = useRef<{
      x: number;
      y: number;
      center: Point;
      scale: number;
    } | null>(null);
  const [width, setWidth] = useState(760);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point | null>(null);
  const [symbols, setSymbols] = useState(true);
  useEffect(() => {
    if (!frame.current || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) =>
      setWidth(Math.max(240, entries[0].contentRect.width)),
    );
    ro.observe(frame.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    setOffset(null);
    setZoom(1);
  }, [resetKey]);
  const height = width < 540 ? 340 : 394;
  const base = Math.min((width - 110) / 1.18, (height - 78) / 0.93);
  const scale = limitScale(base * zoom * (following ? 3.1 : 1));
  const center = offset || (following ? point || target : region);
  const pr = (lon: number, lat: number) => [
    (lon - center.lon) * cos * scale + width / 2,
    (center.lat - lat) * scale + height / 2,
  ];
  const line = (points: number[][]) =>
    points
      .map(([x, y]) =>
        pr(x, y)
          .map((n) => n.toFixed(1))
          .join(","),
      )
      .join(" ");
  const px = point ? pr(point.lon, point.lat) : null;
  const route = [demoOrigin, ...stops].map((p) => [p.lon, p.lat]);
  const km = [1, 2, 5, 10, 20, 50, 100, 200].reduce(
    (best, n) => ((n * scale) / 111 < width * 0.22 ? n : best),
    1,
  );
  const isLive = mode === "gps";
  function follow() {
    setOffset(null);
    setZoom(1);
    setFollowing(true);
  }
  function overview() {
    setOffset(null);
    setZoom(1);
    setFollowing(false);
  }
  return (
    <div className="driveMapFrame" ref={frame}>
      <svg
        className="driveAtlas"
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="North-up landmark map with roads, highlighted stops and a location marker"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { x: e.clientX, y: e.clientY, center, scale };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x,
            dy = e.clientY - d.y;
          if (Math.abs(dx) + Math.abs(dy) < 3) return;
          setOffset({
            lon: d.center.lon - dx / (d.scale * cos),
            lat: Math.max(-85, Math.min(85, d.center.lat + dy / d.scale)),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <pattern
            id="drivegrid"
            width="36"
            height="36"
            patternUnits="userSpaceOnUse"
            x={pr(27, -26)[0] % 36}
            y={pr(27, -26)[1] % 36}
          >
            <path d="M36 0H0V36" fill="none" stroke="#8dada1" opacity=".095" />
          </pattern>
          <filter id="driveGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>
        <rect width={width} height={height} fill="#15352f" />
        <rect width={width} height={height} fill="url(#drivegrid)" />
        {map.roads.map((road, i) => (
          <polyline
            key={i}
            points={line(road.points)}
            fill="none"
            stroke="#698476"
            strokeWidth={road.kind === "primary" ? 3.4 : 1.7}
            strokeLinejoin="round"
            opacity=".72"
          />
        ))}
        {!isLive && (
          <g fill="none" strokeLinejoin="round">
            <polyline
              points={line(route)}
              stroke="#6ef6c1"
              strokeWidth="7"
              opacity=".16"
              filter="url(#driveGlow)"
            />
            <polyline
              points={line(route)}
              stroke="#a2e8c9"
              strokeDasharray="7 6"
              strokeWidth="2.6"
            />
          </g>
        )}
        {isLive && point && inCoverage(point) && (
          <polyline
            points={line([
              [point.lon, point.lat],
              [target.lon, target.lat],
            ])}
            fill="none"
            stroke="#9edac8"
            strokeDasharray="5 8"
            strokeWidth="1.5"
          />
        )}
        {symbols &&
          map.roads
            .filter((r) => r.kind === "primary")
            .map((road) => {
              const [x, y] = pr(
                  road.points[Math.floor(road.points.length * 0.3)][0],
                  road.points[Math.floor(road.points.length * 0.3)][1],
                ),
                text = road.name.split(" ·")[0];
              if (
                x < 38 ||
                x > width - 52 ||
                y < 48 ||
                y > height - 40 ||
                stops.some((s) => {
                  const [a, b] = pr(s.lon, s.lat);
                  return Math.abs(x - a) < 79 && Math.abs(y - b) < 24;
                })
              )
                return null;
              return (
                <g key={road.name} transform={`translate(${x} ${y})`}>
                  <rect
                    x="-14"
                    y="-7"
                    width="28"
                    height="14"
                    rx="4"
                    fill="#335645"
                    stroke="#879b79"
                  />
                  <text
                    y="3"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="#e9eac9"
                  >
                    {text}
                  </text>
                </g>
              );
            })}
        {symbols &&
          map.places.map((p) => {
            const [x, y] = pr(p.lon, p.lat);
            if (
              x < 12 ||
              y < 16 ||
              x > width - 12 ||
              y > height - 8 ||
              stops.some((s) => {
                const [a, b] = pr(s.lon, s.lat);
                return Math.abs(x - a) < 77 && Math.abs(y - b) < 24;
              })
            )
              return null;
            return (
              <g key={p.name} transform={`translate(${x} ${y})`}>
                <circle r="2.5" fill="#95aa96" />
                <text
                  className="atlasPlace"
                  x={x > width - 96 ? -6 : 6}
                  textAnchor={x > width - 96 ? "end" : "start"}
                  y="3"
                >
                  {p.name}
                </text>
              </g>
            );
          })}
        {stops.map((s, i) => {
          const [x, y] = pr(s.lon, s.lat),
            active = s.id === target.id;
          const left = x > width * 0.62;
          return (
            <g key={s.id} transform={`translate(${x} ${y})`}>
              <circle
                r={active ? 11 : 7}
                fill={active ? "#f8ca7c" : "#426d5a"}
                stroke="#142f29"
                strokeWidth="2"
              />
              <text
                y="3.5"
                textAnchor="middle"
                fill={active ? "#283e32" : "#f5f7df"}
                fontSize="9"
                fontWeight="700"
              >
                {i + 1}
              </text>
              {symbols && (active || width > 610 || i !== 2) && (
                <text
                  x={left ? -14 : 14}
                  y={active ? -10 : 4}
                  textAnchor={left ? "end" : "start"}
                  className="atlasStop"
                >
                  {s.name}
                </text>
              )}
            </g>
          );
        })}
        {px && (
          <g transform={`translate(${px[0]} ${px[1]})`}>
            {isLive && point?.accuracy != null && point.accuracy > 0 && (
              <circle
                r={Math.min(2000, (point.accuracy / 111000) * scale)}
                stroke="#69c6df"
                opacity=".19"
                fill="#79cbdc"
              />
            )}
            <circle
              r="17"
              fill="#47b2be"
              stroke="#adf7fe"
              strokeWidth="1"
              opacity=".43"
            />
            {point?.heading == null ? (
              <circle r="7" fill="#c5faff" stroke="#1e6b76" strokeWidth="2" />
            ) : (
              <path
                transform={`rotate(${point.heading})`}
                d="M0 -13 9 10 0 6 -9 10Z"
                stroke="#163f42"
                strokeWidth="2"
                fill="#cdfbfa"
              />
            )}
          </g>
        )}
      </svg>
      <span className="mapType">
        {isLive && point && !inCoverage(point)
          ? "OUTSIDE REGIONAL MAP"
          : "REGIONAL SCHEMATIC · ROADS APPROX."}
      </span>
      <span className="mapNorth" aria-label="North up">
        ↑ N
      </span>
      <div className="mapButtons">
        <button
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => setZoom((v) => Math.min(v * 1.5, 15))}
          disabled={zoom >= 15}
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => setZoom((v) => Math.max(v / 1.5, 0.45))}
          disabled={zoom <= 0.45}
        >
          <Minus size={17} />
        </button>
        <button aria-label="Recenter map" title="Recenter map" onClick={follow}>
          <Crosshair size={17} />
        </button>
        <button
          aria-label="Show route overview"
          title="Show route overview"
          onClick={overview}
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <div className="mapFoot">
        <span>
          <i style={{ width: (km * scale) / 111 }} />
          {km} km
        </span>
        <button aria-pressed={symbols} onClick={() => setSymbols((v) => !v)}>
          Place labels {symbols ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
