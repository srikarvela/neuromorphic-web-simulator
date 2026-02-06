export class STDP {
  tauPlus: number;
  tauMinus: number;
  aPlus: number;
  aMinus: number;

  constructor(params: {
    tauPlus: number;
    tauMinus: number;
    aPlus: number;
    aMinus: number;
  }) {
    this.tauPlus = params.tauPlus;
    this.tauMinus = params.tauMinus;
    this.aPlus = params.aPlus;
    this.aMinus = params.aMinus;
  }

  apply(synapse: { weight: number }, deltaT: number): void {
    if (deltaT > 0) {
      synapse.weight +=
        this.aPlus * Math.exp(-deltaT / this.tauPlus);
    } else {
      synapse.weight -=
        this.aMinus * Math.exp(deltaT / this.tauMinus);
    }
  }
}