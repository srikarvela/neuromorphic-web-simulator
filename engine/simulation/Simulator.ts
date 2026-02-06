import { Network } from "../network/Network.ts";
import { STDP } from "../learning/STDP.ts";

export class Simulator {
  network: Network;
  dt: number;
  time = 0;
  stdp?: STDP;

  constructor(network: Network, dt: number, stdp?: STDP) {
    this.network = network;
    this.dt = dt;
    this.stdp = stdp;
  }

  lastSpikeTimes: Map<number, number> = new Map();

  step(): { neuronId: number; time: number }[] {
    const spikes: { neuronId: number; time: number }[] = [];

    const currents = new Array(this.network.neurons.length).fill(0);

    // Accumulate synaptic currents
    for (const synapse of this.network.synapses) {
      currents[synapse.post] += synapse.computeCurrent(this.time);
    }

    // Step neurons
    for (let i = 0; i < this.network.neurons.length; i++) {
      const neuron = this.network.neurons[i];
      const didSpike = neuron.step(currents[i], this.dt);

      if (didSpike) {
        spikes.push({ neuronId: neuron.id, time: this.time });
        this.lastSpikeTimes.set(neuron.id, this.time);
      }
    }

    // Notify synapses of spikes
    for (const spike of spikes) {
      for (const syn of this.network.outgoingSynapses(spike.neuronId)) {
        syn.notifyPreSpike(spike.time);
      }
      for (const syn of this.network.incomingSynapses(spike.neuronId)) {
        syn.notifyPostSpike(spike.time);
      }
    }

    // Apply STDP
    if (this.stdp) {
      for (const spike of spikes) {
        for (const syn of this.network.outgoingSynapses(spike.neuronId)) {
          const postTime = this.lastSpikeTimes.get(syn.post);
          if (postTime !== undefined) {
            this.stdp.apply(syn, postTime - spike.time);
          }
        }

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