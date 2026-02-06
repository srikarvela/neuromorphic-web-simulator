import { Neuron } from "./Neuron.ts";

export class LIFNeuron extends Neuron {
  tau: number;
  resistance: number;

  constructor(params: {
    id: number;
    threshold: number;
    resetVoltage?: number;
    tau?: number;
    resistance?: number;
  }) {
    super({
      id: params.id,
      threshold: params.threshold,
      resetVoltage: params.resetVoltage ?? 0,
    });

    this.tau = params.tau ?? 0.02;
    this.resistance = params.resistance ?? 1.0;
  }

  step(inputCurrent: number, dt: number): boolean {
    this.voltage +=
      (-(this.voltage) + this.resistance * inputCurrent) * (dt / this.tau);

    if (this.voltage >= this.threshold) {
      this.reset();
      return true;
    }

    return false;
  }
}