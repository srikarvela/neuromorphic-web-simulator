import React from "react";
import "./app.css";
import { RasterPlot } from "./components/RasterPlot.tsx";
import { WeightPlot } from "./components/WeightPlot.tsx";
import { useSimulator } from "./hooks/useSimulator.ts";

export default function App() {
  const sim = useSimulator();

  if (sim.neuronCount === null) {
    return <div style={{ padding: 24 }}>Initializing simulator…</div>;
  }

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Neuromorphic Simulation Tool</h1>
        <div className="subtitle">by Srikar Vela</div>
      </header>

      <main className="app-main">
        {/* LEFT COLUMN */}
        <section className="left-panel">
          <h3>Live Raster Plot</h3>
          <RasterPlot
            spikes={sim.spikes}
            neuronCount={sim.neuronCount}
            pause={sim.pause}
            resumeIfPreviouslyRunning={sim.resumeIfPreviouslyRunning}
          />

          <h3 style={{ marginTop: 24 }}>Live Weight Plot</h3>
          <WeightPlot
            history={sim.history}
            pause={sim.pause}
            resumeIfPreviouslyRunning={sim.resumeIfPreviouslyRunning}
          />
        </section>

        {/* RIGHT COLUMN */}
        <section className="right-panel">
          <div className="controls">
            ⏸ ▶ ⏹
            <span style={{ marginLeft: 12 }}>
              ← pause / resume / restart
            </span>
          </div>

          <div className="model-box">
            Neuromorphic Model / Diagram  
            <br />
            Neurons, synapses, parameters  
            <br />
            (values will appear here)
          </div>
        </section>
      </main>
    </div>
  );
}