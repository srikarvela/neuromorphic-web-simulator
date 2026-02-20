import { Network } from "../network/Network.ts";
import { STDP } from "../learning/STDP.ts";

export class Simulator {
  network: Network;
  dt: number;
  time = 0;
  stdp?: STDP;

  /** neuronId -> last spike time */
  lastSpikeTimes: Map<number, number> = new Map();

  /** neuronId -> neuron array index (stable lookup) */
  private idToIndex: Map<number, number>;

  constructor(network: Network, dt: number, stdp?: STDP) {
    this.network = network;
    this.dt = dt;
    this.stdp = stdp;

    // Build neuronId -> index map once
    this.idToIndex = new Map();
    for (let i = 0; i < this.network.neurons.length; i++) {
      this.idToIndex.set(this.network.neurons[i].id, i);
    }
  }

  /**
   * Step the simulation by dt.
   * Optional external currents are per-neuron INDEX (length = neuronCount).
   * We'll use this for UI inputs (bias, pulses, Poisson, etc.).
   */
  step(externalCurrents?: number[]): { neuronId: number; time: number }[] {
    const spikes: { neuronId: number; time: number }[] = [];

    const n = this.network.neurons.length;
    const currents = new Array(n).fill(0);

    // Add external currents (per index)
    if (externalCurrents) {
      const m = Math.min(n, externalCurrents.length);
      for (let i = 0; i < m; i++) {
        const val = externalCurrents[i];
        currents[i] += Number.isFinite(val) ? (val as number) : 0;
      }
    }

    // Accumulate synaptic currents (syn.pre/syn.post are neuron IDs)
    for (const synapse of this.network.synapses) {
      const postIdx = this.idToIndex.get(synapse.post);
      if (postIdx === undefined) continue; // ignore invalid wiring safely
      currents[postIdx] += synapse.computeCurrent(this.time);
    }

    // Step neurons
    for (let i = 0; i < n; i++) {
      const neuron = this.network.neurons[i];
      const didSpike = neuron.step(currents[i], this.dt);

      if (didSpike) {
        spikes.push({ neuronId: neuron.id, time: this.time });
        this.lastSpikeTimes.set(neuron.id, this.time);
      }
    }

    // Notify synapses of spikes (uses neuron IDs)
    for (const spike of spikes) {
      for (const syn of this.network.outgoingSynapses(spike.neuronId)) {
        syn.notifyPreSpike(spike.time);
      }
      for (const syn of this.network.incomingSynapses(spike.neuronId)) {
        syn.notifyPostSpike(spike.time);
      }
    }

    // Apply STDP (syn.pre/syn.post are neuron IDs, consistent with lastSpikeTimes)
    if (this.stdp) {
      for (const spike of spikes) {
        // pre spiked, update based on last post spike
        for (const syn of this.network.outgoingSynapses(spike.neuronId)) {
          const postTime = this.lastSpikeTimes.get(syn.post);
          if (postTime !== undefined) {
            this.stdp.apply(syn, postTime - spike.time);
          }
        }

        // post spiked, update based on last pre spike
        for (const syn of this.network.incomingSynapses(spike.neuronId)) {
          const preTime = this.lastSpikeTimes.get(syn.pre);
          if (preTime !== undefined) {
            this.stdp.apply(syn, spike.time - preTime);
          }
        }
      }
    }

    this.time += this.dt;
    return spikes;
  }
}