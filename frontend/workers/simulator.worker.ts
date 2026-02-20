/// <reference lib="webworker" />

import { LIFNeuron } from "../../engine/core/LIFNeuron.ts";
import { Synapse } from "../../engine/core/Synapse.ts";
import { Network } from "../../engine/network/Network.ts";
import { Simulator } from "../../engine/simulation/Simulator.ts";
import { STDP } from "../../engine/learning/STDP.ts";

type UiSpike = { neuronId: number; time: number };

type InitPayload = {
  neurons: Array<{ id: number; threshold: number }>;
  synapse: { pre: number; post: number; weight: number };
  stdp: { tauPlus: number; tauMinus: number; aPlus: number; aMinus: number };
  dt: number;
};

let sim: Simulator | null = null;
let running = false;
let intervalId: number | null = null;
let hz = 60;
let lastInit: InitPayload | null = null;

/** External input currents per neuron INDEX */
let biasCurrents: number[] = [];

/** Optional: queued pulses (time-based injection) */
type Pulse = { neuronIndex: number; amplitude: number; remainingSteps: number };
let pulses: Pulse[] = [];

function clearLoop() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function postError(err: unknown) {
  self.postMessage({
    type: "error",
    message: err instanceof Error ? err.message : String(err),
  });
}

function clampNumber(x: any, fallback = 0) {
  const v = Number(x);
  return Number.isFinite(v) ? v : fallback;
}

function buildExternalCurrents(): number[] {
  if (!sim) return [];

  const n = sim.network.neurons.length;
  const ext = new Array(n).fill(0);

  // bias
  for (let i = 0; i < Math.min(n, biasCurrents.length); i++) {
    ext[i] += biasCurrents[i] ?? 0;
  }

  // pulses
  if (pulses.length) {
    for (const p of pulses) {
      if (p.neuronIndex >= 0 && p.neuronIndex < n && p.remainingSteps > 0) {
        ext[p.neuronIndex] += p.amplitude;
        p.remainingSteps -= 1;
      }
    }
    pulses = pulses.filter((p) => p.remainingSteps > 0);
  }

  return ext;
}

function emitStep() {
  if (!sim) return;

  try {
    const external = buildExternalCurrents();

    // ✅ IMPORTANT: pass external currents into sim.step(...)
    const rawSpikes = sim.step(external);

    const spikes: UiSpike[] = rawSpikes.map((s: any) => ({
      neuronId: s.neuronId,
      time: s.time,
    }));

    const weights = sim.network.synapses.map((syn: any) => syn.weight);

    self.postMessage({
      type: "step",
      time: sim.time,
      spikes,
      weights,
    });
  } catch (e) {
    postError(e);
  }
}

function startLoop() {
  if (!sim) return;

  clearLoop();
  running = true;

  const intervalMs = Math.max(1, Math.floor(1000 / hz));
  intervalId = self.setInterval(() => emitStep(), intervalMs);
}

function initFromPayload(payload: InitPayload) {
  try {
    running = false;
    clearLoop();

    lastInit = payload;

    const neurons = (payload.neurons ?? []).map(
      (n) => new LIFNeuron({ id: n.id, threshold: n.threshold })
    );

    const synapses = [new Synapse(payload.synapse)];
    const network = new Network(neurons, synapses);
    const stdp = new STDP(payload.stdp);

    sim = new Simulator(network, payload.dt, stdp);

    // reset external inputs to match neuron count
    biasCurrents = new Array(neurons.length).fill(0);
    pulses = [];

    self.postMessage({ type: "meta", neuronCount: neurons.length });
  } catch (e) {
    postError(e);
  }
}

self.onmessage = (e) => {
  const msg = e.data ?? {};
  const type = msg.type as string | undefined;
  const payload = msg.payload as any;

  if (type === "init") {
    initFromPayload(payload as InitPayload);
    return;
  }

  if (!sim) return;

  // -----------------------------
  // SIM LOOP CONTROL
  // -----------------------------
  if (type === "step") {
    emitStep();
    return;
  }

  if (type === "setHz") {
    const nextHz = clampNumber(payload?.hz, hz);
    if (nextHz > 0) {
      hz = nextHz;
      if (running) startLoop();
    }
    return;
  }

  if (type === "start") {
    const nextHz = clampNumber(payload?.hz, hz);
    if (nextHz > 0) hz = nextHz;
    startLoop();
    return;
  }

  if (type === "pause") {
    running = false;
    clearLoop();
    return;
  }

  if (type === "resume") {
    if (!running) startLoop();
    return;
  }

  if (type === "restart") {
    const initPayload: InitPayload | null = (payload as InitPayload) ?? lastInit;
    if (!initPayload) return;

    initFromPayload(initPayload);
    startLoop();
    return;
  }

  // -----------------------------
  // ✅ INPUTS (cause spikes)
  // -----------------------------
  if (type === "setBias") {
    // payload: { neuronIndex: number, value: number }
    const idx = Math.floor(clampNumber(payload?.neuronIndex, -1));
    const val = clampNumber(payload?.value, 0);
    if (idx >= 0 && idx < biasCurrents.length) biasCurrents[idx] = val;
    return;
  }

  if (type === "setBiasAll") {
    // payload: { value: number }
    const val = clampNumber(payload?.value, 0);
    biasCurrents = biasCurrents.map(() => val);
    return;
  }

  if (type === "pulse") {
    // payload: { neuronIndex: number, amplitude: number, durationMs?: number }
    const idx = Math.floor(clampNumber(payload?.neuronIndex, -1));
    const amp = clampNumber(payload?.amplitude, 0);
    const durationMs = clampNumber(payload?.durationMs, 10);

    // convert duration to steps using sim.dt
    const steps = Math.max(1, Math.floor((durationMs / 1000) / sim.dt));
    if (idx >= 0 && idx < sim.network.neurons.length) {
      pulses.push({ neuronIndex: idx, amplitude: amp, remainingSteps: steps });
    }
    return;
  }
};

export {};