import React, { useMemo, useRef, useState } from "react";

type Tooltip = {
  x: number;
  y: number;
  neuronId: number;
  time: number;
  dt?: number;
} | null;

export type Spike = {
  neuronId: number;
  time: number;
};

type RasterPlotProps = {
  spikes: Spike[];
  neuronCount: number | null;
  timeWindow?: number;
  pause: () => void;
  resumeIfPreviouslyRunning: () => void;
};

const COLORS = ["#00ffcc", "#ff6b6b", "#4dabf7", "#ffd43b", "#b197fc"];

export function RasterPlot({
  spikes,
  neuronCount,
  timeWindow = 1.0,
  pause,
  resumeIfPreviouslyRunning,
}: RasterPlotProps) {
  const width = 520;
  const height = 260;
  const padding = 32;

  const X_TICKS = 5;

  const svgRef = useRef<SVGSVGElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [viewStart, setViewStart] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [follow, setFollow] = useState(true);
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [hovering, setHovering] = useState(false);

  const safeNeuronCount = neuronCount ?? 0;
  const Y_LABEL_STEP =
    safeNeuronCount > 0 ? Math.max(1, Math.floor(safeNeuronCount / 6)) : 1;

  const latestTime = spikes.length ? spikes[spikes.length - 1].time : 0;
  const windowSize = timeWindow / zoom;

  const tMin =
    follow && !hovering ? Math.max(0, latestTime - windowSize) : viewStart;

  const tMax = tMin + windowSize;

  const timeToX = (t: number) =>
    padding + ((t - tMin) / windowSize) * (width - 2 * padding);

  const neuronToY = (id: number) =>
    padding +
    (id / Math.max(1, safeNeuronCount - 1)) * (height - 2 * padding);

  const visibleSpikes = useMemo(() => {
    if (safeNeuronCount === 0) return [] as Spike[];
    return spikes.filter((s) => s.time >= tMin && s.time <= tMax);
  }, [spikes, tMin, tMax, safeNeuronCount]);

  // ✅ compute per-neuron previous spike time within the *visible* window
  // so Δt is meaningful and not always ~0 (your old code made dt ~0 because it used the final spike time)
  const prevTimeByNeuronInVisible = useMemo(() => {
    const map = new Map<number, number>();
    const out = new Map<number, number | undefined>();

    for (const s of visibleSpikes) {
      out.set(s.neuronId, map.get(s.neuronId));
      map.set(s.neuronId, s.time);
    }
    return out;
  }, [visibleSpikes]);

  const xGridTimes = Array.from({ length: X_TICKS + 1 }, (_, i) =>
    tMin + (i / X_TICKS) * windowSize
  );

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left - padding;
    const ratio = mouseX / (width - 2 * padding);

    const newZoom = Math.min(5, Math.max(0.5, zoom - e.deltaY * 0.001));
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
    const dt = (-dx / (width - 2 * padding)) * windowSize * speed;

    setViewStart((v) => Math.max(0, v + dt));
  };

  const onMouseUp = () => setIsPanning(false);

  const resetView = () => {
    setZoom(1);
    setViewStart(0);
    setFollow(true);
  };

  // ✅ safe early return AFTER hooks
  if (neuronCount === null) {
    return <div style={{ padding: 20, color: "#888" }}>Initializing…</div>;
  }

  return (
    <div>
      <h3 style={{ marginBottom: 8 }}>Raster Plot</h3>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDoubleClick={resetView}
        onMouseEnter={() => {
          pause();
          setHovering(true);
        }}
        onMouseLeave={() => {
          onMouseUp();
          setTooltip(null);
          setHovering(false);
          resumeIfPreviouslyRunning();
        }}
        style={{
          background: "#0b0b0b",
          border: "1px solid #222",
          borderRadius: 6,
          cursor: isPanning ? "grabbing" : "grab",
          boxShadow: hovering ? "0 0 0 2px #00ffaa66" : "none",
          transition: "box-shadow 120ms ease",
        }}
      >
        {/* Vertical grid + labels */}
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

        {/* Neuron grid + labels */}
        {Array.from({ length: safeNeuronCount }).map((_, id) => (
          <g key={id}>
            <line
              x1={padding}
              y1={neuronToY(id)}
              x2={width - padding}
              y2={neuronToY(id)}
              stroke="#141414"
              opacity={0.6}
            />
            {id % Y_LABEL_STEP === 0 && (
              <text x={8} y={neuronToY(id) + 4} fill="#555" fontSize={10}>
                n{id}
              </text>
            )}
          </g>
        ))}

        {/* Spikes */}
        {visibleSpikes.map((s, i) => {
          const cx = timeToX(s.time);
          const cy = neuronToY(s.neuronId);
          const prev = prevTimeByNeuronInVisible.get(s.neuronId);
          const dt = prev !== undefined ? s.time - prev : undefined;

          const tooltipWidth = 150;
          const tx =
            cx + tooltipWidth > width ? cx - tooltipWidth - 8 : cx + 8;

          const ty = cy - 40 < 0 ? cy + 12 : cy - 28;

          return (
            <circle
              key={`${s.neuronId}-${s.time}-${i}`}
              cx={cx}
              cy={cy}
              r={hovering ? 4 : 3}
              fill={COLORS[s.neuronId % COLORS.length]}
              onMouseEnter={() => {
                pause();
                setTooltip({
                  x: tx,
                  y: ty,
                  neuronId: s.neuronId,
                  time: s.time,
                  dt,
                });
                setHovering(true);
              }}
              onMouseLeave={() => {
                setTooltip(null);
                setHovering(false);
                resumeIfPreviouslyRunning();
              }}
            />
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g pointerEvents="none">
            <rect
              x={tooltip.x}
              y={tooltip.y}
              width={150}
              height={36}
              rx={6}
              fill="#111"
              stroke="#333"
            />
            <text x={tooltip.x + 10} y={tooltip.y + 14} fill="#ccc" fontSize={11}>
              n={tooltip.neuronId} · t={tooltip.time.toFixed(3)}s
            </text>
            {tooltip.dt !== undefined && (
              <text
                x={tooltip.x + 10}
                y={tooltip.y + 28}
                fill="#888"
                fontSize={10}
              >
                Δt={tooltip.dt.toFixed(3)}s
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}