import { Neuron } from "../core/Neuron.ts";
import { Synapse } from "../core/Synapse.ts";

export class Network {
  neurons: Neuron[];
  synapses: Synapse[];

  /** Map neuronId -> index in neurons[] */
  readonly idToIndex: Map<number, number> = new Map();

  constructor(neurons: Neuron[], synapses: Synapse[]) {
    this.neurons = neurons;
    this.synapses = synapses;

    for (let i = 0; i < neurons.length; i++) {
      this.idToIndex.set(neurons[i].id, i);
    }
  }

  indexOf(neuronId: number): number {
    const idx = this.idToIndex.get(neuronId);
    if (idx === undefined) {
      throw new Error(`Network: unknown neuronId=${neuronId}`);
    }
    return idx;
  }

  outgoingSynapses(neuronId: number): Synapse[] {
    // Assumes syn.pre is a neuronId
    return this.synapses.filter((s) => s.pre === neuronId);
  }

  incomingSynapses(neuronId: number): Synapse[] {
    // Assumes syn.post is a neuronId
    return this.synapses.filter((s) => s.post === neuronId);
  }
}