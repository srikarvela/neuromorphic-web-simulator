import { Neuron } from "../core/Neuron.ts";
import { Synapse } from "../core/Synapse.ts";

export class Network {
  neurons: Neuron[];
  synapses: Synapse[];

  constructor(neurons: Neuron[], synapses: Synapse[]) {
    this.neurons = neurons;
    this.synapses = synapses;
  }

  outgoingSynapses(neuronId: number): Synapse[] {
    return this.synapses.filter(s => s.pre === neuronId);
  }

  incomingSynapses(neuronId: number): Synapse[] {
    return this.synapses.filter(s => s.post === neuronId);
  }
}