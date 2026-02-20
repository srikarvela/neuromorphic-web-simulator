export class STDP {
  tauPlus: number;
  tauMinus: number;
  aPlus: number;
  aMinus: number;

  wMin: number;
  wMax: number;

  constructor(params: {
    tauPlus: number;
    tauMinus: number;
    aPlus: number;
    aMinus: number;
    wMin?: number;
    wMax?: number;
  }) {
    this.tauPlus = params.tauPlus;
    this.tauMinus = params.tauMinus;
    this.aPlus = params.aPlus;
    this.aMinus = params.aMinus;

    this.wMin = params.wMin ?? -5;
    this.wMax = params.wMax ?? 5;
  }

  apply(synapse: { weight: number }, deltaT: number): void {
    if (deltaT > 0) {
      synapse.weight += this.aPlus * Math.exp(-deltaT / this.tauPlus);
    } else if (deltaT < 0) {
      synapse.weight -= this.aMinus * Math.exp(deltaT / this.tauMinus);
    } else {
      return;
    }

    // clamp
    synapse.weight = Math.min(this.wMax, Math.max(this.wMin, synapse.weight));
  }
}