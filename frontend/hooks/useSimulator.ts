import { useEffect, useRef, useState } from "react";

export type Spike = {
  neuronId: number;
  time: number;
};

type WeightPoint = {
  time: number;
  weight: number;
};

const TIME_WINDOW = 1.0; // seconds

export function useSimulator() {
  const workerRef = useRef<Worker | null>(null);

  const [time, setTime] = useState(0);
  const [spikes, setSpikes] = useState<Spike[]>([]);
  const [weights, setWeights] = useState<number[]>([]);
  const [history, setHistory] = useState<WeightPoint[]>([]);
  const [neuronCount, setNeuronCount] = useState<number | null>(null);

  const [running, _setRunning] = useState(false);
  const wasRunningBeforeHover = useRef(false);
  const [hz, setHz] = useState(60);

  // --- Helper functions for controlling the worker ---
  const start = () => {
    workerRef.current?.postMessage({ type: "start", hz });
  };
  const pause = () => {
    if (running) {
      wasRunningBeforeHover.current = true;
      _setRunning(false);
      workerRef.current?.postMessage({ type: "pause" });
    }
  };
  const resumeIfPreviouslyRunning = () => {
    if (wasRunningBeforeHover.current) {
      workerRef.current?.postMessage({ type: "resume" });
      _setRunning(true);
      wasRunningBeforeHover.current = false;
    }
  };

  // setRunning should sync with the worker
  const setRunning = (value: boolean) => {
    if (value) {
      _setRunning(true);
      start();
    } else {
      _setRunning(false);
      pause();
    }
  };

  // --- Worker setup ---
  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/simulator.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current = worker;

    worker.postMessage({
      type: "init",
      payload: {
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
      },
    });

    // Immediately start simulation after init
    worker.postMessage({ type: "start", hz });
    _setRunning(true);

    worker.onmessage = (e) => {
      const msg = e.data;

      if (msg.type === "meta") {
        setNeuronCount(msg.neuronCount);
        return;
      }

      if (msg.type === "step") {
        setTime(msg.time);

        setSpikes((prev) =>
          [...prev, ...msg.spikes].filter(
            (s) => msg.time - s.time <= TIME_WINDOW
          )
        );

        setWeights(msg.weights);

        setHistory((prev) =>
          [...prev, { time: msg.time, weight: msg.weights[0] }]
            .filter((h) => msg.time - h.time <= TIME_WINDOW)
        );
      }
    };

    return () => worker.terminate();
  }, []);

  // --- Remove React-side run loop ---

  const step = () => {
    workerRef.current?.postMessage({ type: "step" });
  };

  return {
    time,
    spikes,
    weights,
    history,
    neuronCount,

    step,
    running,
    setRunning,
    hz,
    setHz,
    pause,
    resumeIfPreviouslyRunning,
  };
}