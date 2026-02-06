import { LIFNeuron } from "../core/LIFNeuron.ts";
import { Synapse } from "../core/Synapse.ts";
import { Network } from "../network/Network.ts";
import { Simulator } from "./Simulator.ts";
import { STDP } from "../learning/STDP.ts";

const n0 = new LIFNeuron({ id: 0, threshold: 1 });
const n1 = new LIFNeuron({ id: 1, threshold: 1 });

const syn = new Synapse({
  pre: 0,
  post: 1,
  weight: 1.0,
});

const net = new Network([n0, n1], [syn]);

const stdp = new STDP({
  tauPlus: 0.02,
  tauMinus: 0.02,
  aPlus: 0.05,
  aMinus: 0.04,
});

const sim = new Simulator(net, 0.001, stdp);

console.log("Starting simulation...");

for (let i = 0; i < 20; i++) {
  const t = sim.time;

  if (i % 2 === 0) syn.notifyPreSpike(t);
  if (i % 2 === 1) syn.notifyPostSpike(t + 0.005);

  sim.step();

  console.log(
    `t=${sim.time.toFixed(3)}s : synapse weight = ${syn.weight.toFixed(4)}`
  );
}

console.log("Simulation complete.");