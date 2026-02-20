import { useEffect, useMemo, useRef, useState } from "react";

export type Spike = { neuronId: number; time: number };
export type WeightPoint = { time: number; weight: number };

const MAX_BUFFER_SECONDS = 10.0;

type InitPayload = {
  neurons: Array<{ id: number; threshold: number }>;
  synapse: { pre: number; post: number; weight: number };
  stdp: { tauPlus: number; tauMinus: number; aPlus: number; aMinus: number };
  dt: number;
};

type PairingOptions = {
  repeats?: number;       // how many pairings
  delayMs?: number;       // pre->post delay (STDP)
  intervalMs?: number;    // spacing between pairings
  amplitude?: number;     // pulse amplitude
  durationMs?: number;    // pulse duration
};

export function useSimulator() {
  const workerRef = useRef<Worker | null>(null);
  const lastInitRef = useRef<InitPayload | null>(null);

  const [time, setTime] = useState(0);
  const [spikes, setSpikes] = useState<Spike[]>([]);
  const [weights, setWeights] = useState<number[]>([]);
  const [history, setHistory] = useState<WeightPoint[]>([]);
  const [neuronCount, setNeuronCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [hz, setHz] = useState(60);

  // Plot/UI time window (seconds)
  const [timeWindow, setTimeWindow] = useState(1.0);

  // Force plot remount on restart to clear zoom/pan/viewStart in components
  const [runId, setRunId] = useState(0);

  // Inputs (UI-controlled)
  const [bias, setBiasState] = useState<number[]>([]); // per-neuron INDEX

  // -------------------------
  // Pairing experiment timers
  // -------------------------
  const pairingIntervalRef = useRef<number | null>(null);
  const pairingTimeoutsRef = useRef<number[]>([]);

  const clearPairingTimers = () => {
    if (pairingIntervalRef.current !== null) {
      window.clearInterval(pairingIntervalRef.current);
      pairingIntervalRef.current = null;
    }
    if (pairingTimeoutsRef.current.length) {
      for (const id of pairingTimeoutsRef.current) window.clearTimeout(id);
      pairingTimeoutsRef.current = [];
    }
  };

  const initPayload = useMemo<InitPayload>(
    () => ({
      neurons: [
        { id: 0, threshold: 1 },
        { id: 1, threshold: 1 },
      ],
      synapse: { pre: 0, post: 1, weight: 1 },
      stdp: {
        tauPlus: 0.02,
        tauMinus: 0.02,
        aPlus: 0.05,
        aMinus: 0.04,
      },
      dt: 0.001,
    }),
    []
  );

  // --- Worker setup ---
  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/simulator.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current = worker;
    lastInitRef.current = initPayload;

    worker.onerror = (e) => setError(e.message || "Worker error");

    worker.onmessage = (e) => {
      const msg = e.data;

      if (msg?.type === "error") {
        setError(msg.message ?? "Worker error");
        return;
      }

      if (msg?.type === "meta") {
        const n = Number(msg.neuronCount);
        setNeuronCount(Number.isFinite(n) ? n : null);

        // Initialize bias arrays to match neuron count (once we know it)
        if (Number.isFinite(n) && n > 0) {
          setBiasState((prev) => {
            if (prev.length === n) return prev;
            return new Array(n).fill(0);
          });
        }
        return;
      }

      if (msg?.type === "step") {
        const t = Number(msg.time) || 0;
        setTime(t);

        const newSpikes: Spike[] = Array.isArray(msg.spikes) ? msg.spikes : [];
        setSpikes((prev) => {
          const merged = [...prev, ...newSpikes];
          const cutoff = t - MAX_BUFFER_SECONDS;
          return merged.filter((s) => s.time >= cutoff);
        });

        const newWeights: number[] = Array.isArray(msg.weights)
          ? msg.weights
          : [];
        setWeights(newWeights);

        const w0 = typeof newWeights[0] === "number" ? newWeights[0] : 0;
        setHistory((prev) => {
          const merged = [...prev, { time: t, weight: w0 }];
          const cutoff = t - MAX_BUFFER_SECONDS;
          return merged.filter((h) => h.time >= cutoff);
        });

        return;
      }
    };

    // init + autostart
    worker.postMessage({ type: "init", payload: initPayload });
    worker.postMessage({ type: "start", payload: { hz } });
    setRunning(true);

    return () => {
      clearPairingTimers(); // ✅ important: stop loops on unmount
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // update worker hz live
  useEffect(() => {
    if (!running) return;
    workerRef.current?.postMessage({ type: "setHz", payload: { hz } });
  }, [hz, running]);

  // -------------------------
  // Global sim controls (buttons)
  // -------------------------
  const pauseGlobal = () => {
    clearPairingTimers(); // ✅ stop any experiment when pausing
    workerRef.current?.postMessage({ type: "pause" });
    setRunning(false);
  };

  const resumeGlobal = () => {
    workerRef.current?.postMessage({ type: "resume" });
    setRunning(true);
  };

  const step = () => workerRef.current?.postMessage({ type: "step" });

  const restart = () => {
    clearPairingTimers(); // ✅ stop any experiment on restart

    setError(null);
    setTime(0);
    setSpikes([]);
    setWeights([]);
    setHistory([]);

    // force plots to reset their internal state (zoom/pan/follow)
    setRunId((r) => r + 1);

    workerRef.current?.postMessage({
      type: "restart",
      payload: lastInitRef.current,
    });

    setRunning(true);
  };

  // -------------------------
  // Hover-pause (plots)
  // -------------------------
  const wasRunningBeforeHover = useRef(false);

  const pauseForHover = () => {
    wasRunningBeforeHover.current = running;
    workerRef.current?.postMessage({ type: "pause" });
    setRunning(false);
  };

  const resumeIfPreviouslyRunning = () => {
    if (wasRunningBeforeHover.current) {
      wasRunningBeforeHover.current = false;
      workerRef.current?.postMessage({ type: "resume" });
      setRunning(true);
    }
  };

  // -------------------------
  // Inputs (cause spikes)
  // -------------------------
  const setBias = (neuronIndex: number, value: number) => {
    setBiasState((prev) => {
      const next = prev.slice();
      if (neuronIndex >= 0 && neuronIndex < next.length) next[neuronIndex] = value;
      return next;
    });

    workerRef.current?.postMessage({
      type: "setBias",
      payload: { neuronIndex, value },
    });
  };

  const setBiasAll = (value: number) => {
    setBiasState((prev) => prev.map(() => value));
    workerRef.current?.postMessage({
      type: "setBiasAll",
      payload: { value },
    });
  };

  const pulse = (neuronIndex: number, amplitude: number, durationMs = 10) => {
    workerRef.current?.postMessage({
      type: "pulse",
      payload: { neuronIndex, amplitude, durationMs },
    });
  };

  // -------------------------
  // NEW: Automated pairing experiment (STDP demo)
  // -------------------------
  const stopPairing = () => {
    clearPairingTimers();
  };

  const pairingExperiment = (
    pre: number,
    post: number,
    opts: PairingOptions = {}
  ) => {
    clearPairingTimers();

    const repeats = opts.repeats ?? 8;
    const delayMs = opts.delayMs ?? 15;        // pre->post (ms)
    const intervalMs = opts.intervalMs ?? 220; // between pairings
    const amplitude = opts.amplitude ?? 3.0;
    const durationMs = opts.durationMs ?? 10;

    let k = 0;

    // fire one pairing immediately, then repeat
    const fireOne = () => {
      // pre spike
      pulse(pre, amplitude, durationMs);

      // post spike slightly later
      const to = window.setTimeout(() => {
        pulse(post, amplitude, durationMs);
      }, delayMs);
      pairingTimeoutsRef.current.push(to);

      k += 1;
      if (k >= repeats) {
        clearPairingTimers();
      }
    };

    fireOne();
    pairingIntervalRef.current = window.setInterval(() => {
      fireOne();
    }, intervalMs);
  };

  return {
    time,
    spikes,
    weights,
    history,
    neuronCount,
    error,

    running,
    hz,
    setHz,

    timeWindow,
    setTimeWindow,

    runId,

    // controls
    step,
    pause: pauseForHover, // plots call pause on hover
    pauseGlobal, // UI play/pause uses this
    resume: resumeGlobal,
    resumeIfPreviouslyRunning,
    restart,

    // inputs
    bias,
    setBias,
    setBiasAll,
    pulse,

    // NEW: experiments
    pairingExperiment,
    stopPairing,
  };
}