export abstract class Neuron {
  id: number;
  threshold: number;
  resetVoltage: number;
  voltage: number;

  constructor(params: {
    id: number;
    threshold: number;
    resetVoltage: number;
  }) {
    this.id = params.id;
    this.threshold = params.threshold;
    this.resetVoltage = params.resetVoltage;
    this.voltage = params.resetVoltage;
  }

  abstract step(inputCurrent: number, dt: number): boolean;

  reset(): void {
    this.voltage = this.resetVoltage;
  }
}