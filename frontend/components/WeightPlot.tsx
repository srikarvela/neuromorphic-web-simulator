import React, { useMemo, useRef, useState } from "react";

type WeightPoint = {
  time: number;
  weight: number;
};

type Tooltip = {
  x: number;
  y: number;
  time: number;
  weight: number;
  dw?: number;
} | null;

type WeightPlotProps = {
  history: WeightPoint[];
  timeWindow?: number;
  pause: () => void;
  resumeIfPreviouslyRunning: () => void;
};

export function WeightPlot({
  history,
  timeWindow = 1.0,
  pause,
  resumeIfPreviouslyRunning,
}: WeightPlotProps) {
  const width = 520;
  const height = 220;
  const padding = 32;

  const X_TICKS = 5;
  const Y_TICKS = 4;

  const svgRef = useRef<SVGSVGElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [viewStart, setViewStart] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [follow, setFollow] = useState(true);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [hovering, setHovering] = useState(false);

  if (history.length === 0) {
    return <div style={{ color: "#888" }}>No weight data</div>;
  }

  const latestTime = history[history.length - 1].time;
  const windowSize = timeWindow / zoom;

  const tMin =
    follow && !hovering
      ? Math.max(0, latestTime - windowSize)
      : viewStart;

  const tMax = tMin + windowSize;

  const visible = useMemo(
    () => history.filter((p) => p.time >= tMin && p.time <= tMax),
    [history, tMin, tMax]
  );

  const wMin = Math.min(...visible.map((p) => p.weight));
  const wMax = Math.max(...visible.map((p) => p.weight));
  const wRange = Math.max(1e-6, wMax - wMin);

  const xGridTimes = Array.from({ length: X_TICKS + 1 }, (_, i) =>
    tMin + (i / X_TICKS) * windowSize
  );

  const yGridWeights = Array.from({ length: Y_TICKS + 1 }, (_, i) =>
    wMin + (i / Y_TICKS) * wRange
  );

  const timeToX = (t: number) =>
    padding +
    ((t - tMin) / windowSize) * (width - 2 * padding);

  const weightToY = (w: number) =>
    height -
    padding -
    ((w - wMin) / wRange) * (height - 2 * padding);

  const path = visible
    .map((p, i) =>
      `${i === 0 ? "M" : "L"} ${timeToX(p.time)} ${weightToY(p.weight)}`
    )
    .join(" ");

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left - padding;
    const ratio = mouseX / (width - 2 * padding);

    const newZoom = Math.min(
      5,
      Math.max(0.5, zoom - e.deltaY * 0.001)
    );

    const newWindow = timeWindow / newZoom;
    const newViewStart = tMin + ratio * (windowSize - newWindow);

    setZoom(newZoom);
    setViewStart(Math.max(0, newViewStart));
    setFollow(false);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setLastMouseX(e.clientX);
    setFollow(false);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;

    const dx = e.clientX - lastMouseX;
    setLastMouseX(e.clientX);

    const speed = e.shiftKey ? 3 : 1;
    const dt =
      (-dx / (width - 2 * padding)) * windowSize * speed;

    setViewStart((v) => Math.max(0, v + dt));
  };

  const onMouseUp = () => setIsPanning(false);

  const resetView = () => {
    setZoom(1);
    setViewStart(0);
    setFollow(true);
  };

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Weight Evolution</h3>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={resetView}
        onMouseEnter={() => pause()}
        onMouseLeave={() => {
          onMouseUp();
          resumeIfPreviouslyRunning();
        }}
        style={{
          background: "#0b0b0b",
          border: "1px solid #222",
          borderRadius: 6,
          cursor: isPanning ? "grabbing" : "grab",
          boxShadow: hovering
            ? "0 0 0 2px #00ffaa66"
            : "none",
          transition: "box-shadow 120ms ease",
        }}
      >
        {/* Vertical time grid + labels */}
        {xGridTimes.map((t, i) => (
          <g key={i}>
            <line
              x1={timeToX(t)}
              y1={padding}
              x2={timeToX(t)}
              y2={height - padding}
              stroke="#1a1a1a"
              opacity={0.7}
            />
            <text
              x={timeToX(t)}
              y={height - 6}
              fill="#666"
              fontSize={10}
              textAnchor="middle"
            >
              {t.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Horizontal weight grid + labels */}
        {yGridWeights.map((w, i) => (
          <g key={i}>
            <line
              x1={padding}
              y1={weightToY(w)}
              x2={width - padding}
              y2={weightToY(w)}
              stroke="#141414"
              opacity={0.6}
            />
            <text
              x={8}
              y={weightToY(w) + 4}
              fill="#555"
              fontSize={10}
            >
              {w.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Weight curve */}
        <path
          d={path}
          fill="none"
          stroke="#00ffaa"
          strokeWidth={2}
          onMouseMove={(e) => {
            pause();
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;

            const x = e.clientX - rect.left;
            const t =
              tMin +
              ((x - padding) / (width - 2 * padding)) *
                windowSize;

            const nearest = visible.reduce((prev, curr) =>
              Math.abs(curr.time - t) < Math.abs(prev.time - t)
                ? curr
                : prev
            );

            const idx = history.indexOf(nearest);
            const prev = history[idx - 1];
            const dw = prev ? nearest.weight - prev.weight : undefined;

            const tooltipWidth = 160;
            const cx = timeToX(nearest.time);
            const cy = weightToY(nearest.weight);

            const tx =
              cx + tooltipWidth > width
                ? cx - tooltipWidth - 8
                : cx + 8;

            const ty =
              cy - 40 < 0 ? cy + 12 : cy - 28;

            setTooltip({
              x: tx,
              y: ty,
              time: nearest.time,
              weight: nearest.weight,
              dw,
            });
            setHovering(true);
          }}
          onMouseLeave={() => {
            setTooltip(null);
            setHovering(false);
            resumeIfPreviouslyRunning();
          }}
        />

        {/* Tooltip */}
        {tooltip && (
          <g
            pointerEvents="none"
            style={{
              transition: "opacity 120ms ease, transform 120ms ease",
            }}
          >
            <rect
              x={tooltip.x}
              y={tooltip.y}
              width={160}
              height={40}
              rx={6}
              fill="#111"
              stroke="#333"
            />
            <text
              x={tooltip.x + 10}
              y={tooltip.y + 14}
              fill="#ccc"
              fontSize={11}
            >
              w={tooltip.weight.toFixed(3)} · t={tooltip.time.toFixed(3)}s
            </text>
            {tooltip.dw !== undefined && (
              <text
                x={tooltip.x + 10}
                y={tooltip.y + 28}
                fill="#888"
                fontSize={10}
              >
                Δw={tooltip.dw.toExponential(2)}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}