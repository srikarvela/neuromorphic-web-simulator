import React from "react";
import "./app.css";
import { RasterPlot } from "./components/RasterPlot.tsx";
import { WeightPlot } from "./components/WeightPlot.tsx";
import { useSimulator } from "./hooks/useSimulator.ts";

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function pct(value: number, min: number, max: number) {
  if (max === min) return 0;
  return clamp01((value - min) / (max - min));
}

// 0..1 => green -> yellow -> red
function mixColor(t: number) {
  const r = Math.round(56 + (255 - 56) * t);
  const g = Math.round(255 + (66 - 255) * t);
  const b = Math.round(122 + (66 - 122) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function thumbColor(value: number, min: number, max: number) {
  const t = max === min ? 0 : (value - min) / (max - min);
  return mixColor(clamp01(t));
}

export default function App() {
  const sim = useSimulator();

  // slider visual helpers
  const styleRange = (value: number, min: number, max: number) =>
    ({
      // color for thumb + filled portion
      ["--thumbColor" as any]: thumbColor(value, min, max),
      // 0..1 for fill percent
      ["--p" as any]: `${pct(value, min, max)}`,
    } as React.CSSProperties);

  if (sim.error) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Runtime error</h2>
        <pre style={{ whiteSpace: "pre-wrap" }}>{sim.error}</pre>
      </div>
    );
  }

  if (sim.neuronCount === null) {
    return <div style={{ padding: 24 }}>Initializing simulator…</div>;
  }

  // Phase-1 UI: assume 2 neurons (phase-2 will make this dynamic)
  const bias0 = sim.bias?.[0] ?? 0;
  const bias1 = sim.bias?.[1] ?? 0;
  const globalBias = (bias0 + bias1) / 2;

  const onToggleRun = () => {
    if (sim.running) sim.pauseGlobal();
    else sim.resume();
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">
          Neuromorphic Simulation Tool{" "}
          <span className="app-by">by Srikar Vela</span>
        </h1>
      </header>

      <main className="app-main">
        {/* LEFT COLUMN */}
        <section className="left-panel">
          <h3 className="plot-h">Live Raster Plot</h3>
          <div className="plot-shell">
            <RasterPlot
              key={`raster-${sim.runId}`}
              spikes={sim.spikes}
              neuronCount={sim.neuronCount}
              pause={sim.pause}
              resumeIfPreviouslyRunning={sim.resumeIfPreviouslyRunning}
              timeWindow={sim.timeWindow}
            />
          </div>

          <h3 className="plot-h" style={{ marginTop: 18 }}>
            Live Weight Plot
          </h3>
          <div className="plot-shell">
            <WeightPlot
              key={`weight-${sim.runId}`}
              history={sim.history}
              pause={sim.pause}
              resumeIfPreviouslyRunning={sim.resumeIfPreviouslyRunning}
              timeWindow={sim.timeWindow}
            />
          </div>
        </section>

        {/* RIGHT COLUMN */}
        <section className="right-panel">
          {/* transport */}
          <div className="transport">
            <div className="transport-left">
              <button
                type="button"
                className={`primary-btn ${sim.running ? "active" : ""}`}
                onClick={onToggleRun}
                title={sim.running ? "Pause" : "Resume"}
              >
                {sim.running ? "Pause" : "Resume"}
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={sim.restart}
                title="Reset"
              >
                Reset
              </button>
            </div>

            <div className="transport-tip">
              Tip: raise bias or tap Pulse to generate spikes.
            </div>
          </div>

          {/* SIMULATION */}
          <div className="panel">
            <div className="panel-title">Simulation</div>

            {/* Speed */}
            <div className="control-row">
              <div className="label-box">
                <div className="label-title">Speed</div>
                <div className="label-sub">(Hz)</div>
              </div>

              <input
                className="grad-slider"
                type="range"
                min={1}
                max={240}
                step={1}
                value={sim.hz}
                style={styleRange(sim.hz, 1, 240)}
                onChange={(e) => sim.setHz(Number(e.target.value))}
              />

              <div className="value-box">{sim.hz}</div>
            </div>

            {/* Time Window */}
            <div className="control-row">
              <div className="label-box">
                <div className="label-title">Time window</div>
                <div className="label-sub">(s)</div>
              </div>

              <input
                className="grad-slider"
                type="range"
                min={0.2}
                max={5}
                step={0.05}
                value={sim.timeWindow}
                style={styleRange(sim.timeWindow, 0.2, 5)}
                onChange={(e) => sim.setTimeWindow(Number(e.target.value))}
              />

              <div className="value-box">{sim.timeWindow.toFixed(2)}</div>
            </div>
          </div>

          {/* INPUTS */}
          <div className="panel" style={{ marginTop: 16 }}>
            <div className="panel-title">Inputs</div>

            {/* global bias */}
            <div className="control-row">
              <div className="label-box">
                <div className="label-title">Bias</div>
                <div className="label-sub">(all neurons)</div>

                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => sim.setBiasAll(0)}
                  title="Set global bias to 0"
                >
                  Zero
                </button>
              </div>

              <input
                className="grad-slider"
                type="range"
                min={0}
                max={5}
                step={0.01}
                value={globalBias}
                style={styleRange(globalBias, 0, 5)}
                onChange={(e) => sim.setBiasAll(Number(e.target.value))}
              />

              <div className="value-box">{globalBias.toFixed(2)}</div>
            </div>

            {/* neuron 0 */}
            <div className="control-row">
              <div className="label-box">
                <div className="label-title">Neuron 0</div>
                <div className="label-sub">Bias</div>

                <button
                  type="button"
                  className="mini-btn"
                  onClick={() =>
                    // LTP-style demo: fire neuron 0 then neuron 1 repeatedly
                    sim.pairingExperiment(0, 1, {
                      repeats: 10,
                      delayMs: 15,
                      intervalMs: 220,
                      amplitude: 3.0,
                      durationMs: 10,
                    })
                  }
                  title="Run an automated spike pairing burst (0 then 1)"
                >
                  Pulse
                </button>
              </div>

              <input
                className="grad-slider"
                type="range"
                min={0}
                max={5}
                step={0.01}
                value={bias0}
                style={styleRange(bias0, 0, 5)}
                onChange={(e) => sim.setBias(0, Number(e.target.value))}
              />

              <div className="value-box">{bias0.toFixed(2)}</div>
            </div>

            {/* neuron 1 */}
            <div className="control-row">
              <div className="label-box">
                <div className="label-title">Neuron 1</div>
                <div className="label-sub">Bias</div>

                <button
                  type="button"
                  className="mini-btn"
                  onClick={() =>
                    // LTD-style demo for synapse 0->1: fire neuron 1 then neuron 0 repeatedly (post-before-pre)
                    sim.pairingExperiment(1, 0, {
                      repeats: 10,
                      delayMs: 15,
                      intervalMs: 220,
                      amplitude: 3.0,
                      durationMs: 10,
                    })
                  }
                  title="Run an automated spike pairing burst (1 then 0)"
                >
                  Pulse
                </button>
              </div>

              <input
                className="grad-slider"
                type="range"
                min={0}
                max={5}
                step={0.01}
                value={bias1}
                style={styleRange(bias1, 0, 5)}
                onChange={(e) => sim.setBias(1, Number(e.target.value))}
              />

              <div className="value-box">{bias1.toFixed(2)}</div>
            </div>
          </div>

          {/* MODEL BOX (roadmap / notes) */}
          <div className="model-box blank">
            <div className="roadmap">
              <div className="roadmap-title">Roadmap / Notes</div>
              <div className="roadmap-text">
                This demo is intentionally limited to 2 neurons + 1 synapse.
                <br />
                The goal is to make STDP behavior easy to see and understand first.
              </div>
              <div className="roadmap-subtitle">Coming next:</div>
              <ul className="roadmap-list">
                <li>More neurons</li>
                <li>Multiple synapses</li>
                <li>Graph overlays</li>
                <li>
                  Parameter controls for τ+, τ−, A+, A−
                </li>
                <li>Export spike logs (CSV)</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}