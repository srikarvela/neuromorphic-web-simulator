export class Synapse {
  pre: number;
  post: number;
  weight: number;

  lastPreSpike?: number;
  lastPostSpike?: number;

  constructor(params: {
    pre: number;
    post: number;
    weight: number;
  }) {
    this.pre = params.pre;
    this.post = params.post;
    this.weight = params.weight;
  }

  notifyPreSpike(time: number): void {
    this.lastPreSpike = time;
  }

  notifyPostSpike(time: number): void {
    this.lastPostSpike = time;
  }

  computeDeltaT(): number | null {
    if (
      this.lastPreSpike === undefined ||
      this.lastPostSpike === undefined
    ) {
      return null;
    }
    return this.lastPostSpike - this.lastPreSpike;
  }

  computeCurrent(time: number): number {
    // Simple current model: instantaneous weight on pre-spike
    if (this.lastPreSpike === undefined) return 0;

    // Only inject current at the moment of spike
    if (Math.abs(time - this.lastPreSpike) < 1e-9) {
      return this.weight;
    }

    return 0;
  }
}