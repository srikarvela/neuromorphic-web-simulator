export class Synapse {
  pre: number;
  post: number;
  weight: number;
  delay: number;   // seconds
  tau: number;     // seconds (decay)

  lastPreSpike?: number;
  lastPostSpike?: number;

  constructor(params: {
    pre: number;
    post: number;
    weight: number;
    delay?: number;
    tau?: number;
  }) {
    this.pre = params.pre;
    this.post = params.post;
    this.weight = params.weight;

    this.delay = params.delay ?? 0;
    this.tau = params.tau ?? 0.01;
  }

  notifyPreSpike(time: number): void {
    this.lastPreSpike = time;
  }

  notifyPostSpike(time: number): void {
    this.lastPostSpike = time;
  }

  computeDeltaT(): number | null {
    if (this.lastPreSpike === undefined || this.lastPostSpike === undefined) {
      return null;
    }
    return this.lastPostSpike - this.lastPreSpike;
  }

  computeCurrent(time: number): number {
    if (this.lastPreSpike === undefined) return 0;

    const t0 = this.lastPreSpike + this.delay;
    const dt = time - t0;

    if (dt < 0) return 0;

    // decaying PSC: w * exp(-dt/tau)
    return this.weight * Math.exp(-dt / this.tau);
  }
}