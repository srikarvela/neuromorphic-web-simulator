/// <reference lib="webworker" />

import { LIFNeuron } from "../../engine/core/LIFNeuron.ts";
import { Synapse } from "../../engine/core/Synapse.ts";
import { Network } from "../../engine/network/Network.ts";
import { Simulator } from "../../engine/simulation/Simulator.ts";
import { STDP } from "../../engine/learning/STDP.ts";

/**
 * UI-facing spike shape (authoritative)
 */
type UiSpike = {
  neuronId: number;
  time: number;
};

let sim: Simulator | null = null;

function emitStep() {
  if (!sim) return;

  try {
    const rawSpikes = sim.step();

    const spikes: UiSpike[] = rawSpikes.map((s: any) => ({
      neuronId: s.neuronId,
      time: s.time,
    }));

    const weights = sim.network.synapses.map((syn) => syn.weight);

    self.postMessage({
      type: "step",
      time: sim.time,
      spikes,
      weights,
    });
  } catch (err) {
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

self.onmessage = (e) => {
  const { type, payload } = e.data ?? {};

  // -----------------------------
  // INIT
  // -----------------------------
  if (type === "init") {
    const neurons = (payload?.neurons ?? []).map(
      (n: { id: number; threshold: number }) => new LIFNeuron(n)
    );

    const synapses = [new Synapse(payload.synapse)];

    const network = new Network(neurons, synapses);
    const stdp = new STDP(payload.stdp);

    sim = new Simulator(network, payload.dt, stdp);

    // META (sent once)
    self.postMessage({
      type: "meta",
      neuronCount: neurons.length,
    });

    return;
  }

  // -----------------------------
  // STEP
  // -----------------------------
  if (type === "step") {
    emitStep();
    return;
  }
};

// force module scope for Vite/TS workers
export {};