import { Neuron } from "./Neuron.ts";

export class LIFNeuron extends Neuron {
  tau: number; // seconds
  resistance: number; // gain from current -> voltage

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
    // Basic Euler integration of:
    // dV/dt = ( -V + R*I ) / tau
    const dv = (-(this.voltage) + this.resistance * inputCurrent) * (dt / this.tau);
    this.voltage += dv;

    if (this.voltage >= this.threshold) {
      this.reset();
      return true;
    }

    return false;
  }
}