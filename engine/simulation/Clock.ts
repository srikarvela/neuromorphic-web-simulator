export class Clock {
  time: number;
  dt: number;

  constructor(dt: number) {
    this.dt = dt;
    this.time = 0;
  }

  tick(): number {
    this.time += this.dt;
    return this.time;
  }
}