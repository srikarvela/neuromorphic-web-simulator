

# Neuromorphic Web Simulator

A browser-based neuromorphic simulation tool that visualizes spiking neural dynamics and synaptic plasticity in real time.

This project combines a **TypeScript-based neuromorphic simulation engine** with a **React + WebWorker front-end**, allowing users to explore spiking behavior, raster plots, and synaptic weight evolution interactively.

---

## 🚧 Project Status

**Current version:** `v0.1-ui-pipeline`  
This is an early-stage checkpoint focused on **infrastructure, architecture, and data flow**.

✔ Core simulation engine implemented  
✔ WebWorker-based simulation loop  
✔ React UI pipeline wired end-to-end  
✔ Live raster & weight plotting hooks in place  
❌ External stimulation & inputs (coming next)  
❌ Multi-neuron network editor (planned)

---

## 🧠 Architecture Overview

```
┌────────────┐        messages        ┌────────────────────┐
│  React UI  │  <------------------>  │  Simulator Worker   │
│            │                        │  (WebWorker)        │
│ RasterPlot │                        │  Time stepping      │
│ WeightPlot │                        │  STDP updates       │
└────────────┘                        └──────────┬─────────┘
                                                 │
                                      ┌──────────▼─────────┐
                                      │ Neuromorphic Engine │
                                      │  • LIF Neurons     │
                                      │  • Synapses        │
                                      │  • STDP Learning   │
                                      └────────────────────┘
```

The simulation runs **off the main UI thread**, ensuring smooth visualization even as the model complexity increases.

---

## ⚙️ Core Features

### Simulation Engine (TypeScript)
- Leaky Integrate-and-Fire (LIF) neuron model
- Synapse abstraction with dynamic weights
- STDP (Spike-Timing Dependent Plasticity)
- Deterministic clock-based stepping
- Standalone test harness for validation

### Frontend (React + Vite)
- Live raster plot visualization
- Live synaptic weight tracking
- WebWorker-based simulation control
- Pause / resume / restart controls
- Modular component design

---

## 📁 Repository Structure

```
neuromorphic-web-simulator/
├── engine/                 # Simulation engine (framework-agnostic)
│   ├── core/               # Neurons, synapses, spikes
│   ├── learning/           # STDP rules
│   ├── network/            # Network topology
│   └── simulation/         # Clock & simulator
│
├── frontend/               # React UI
│   ├── components/         # RasterPlot, WeightPlot, etc.
│   ├── hooks/              # useSimulator hook
│   └── workers/            # simulator.worker.ts
│
├── docs/                   # Design notes (planned)
├── public/
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## ▶️ Running the Project

```bash
npm install
npm run dev
```

Then open:  
**http://localhost:5173**

---

## 🧪 Engine Validation

The neuromorphic engine is validated independently using a Node-based test harness:

```bash
node --loader ts-node/esm engine/simulation/testHarness.ts
```

This verifies:
- Stable neuron dynamics
- Correct synaptic updates
- STDP weight evolution

---

## 🔮 Planned Next Steps

- External spike stimulation sources
- Multi-neuron network editor (UI)
- Parameter tuning controls (thresholds, time constants)
- Interactive model diagram
- Exportable simulation data

---

## 🎯 Motivation

The goal of this project is **not** to replicate large-scale deep learning frameworks, but to provide:
- Intuition for spiking neural systems
- Clear visualization of learning dynamics
- A clean, inspectable codebase for neuromorphic concepts

This project is designed to be **educational, experimental, and extensible**.

---

## 📜 License

MIT License (planned)