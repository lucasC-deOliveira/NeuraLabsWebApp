"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cycleSeconds, tick, type PomodoroCycle } from "./pomodoro";

// O estado e o intervalo vivem AQUI, no topo do app, e não no header: o header é
// remontado a cada navegação, e um timer que zera ao trocar de página não serve
// para acompanhar uma sessão de estudo.

interface PomodoroState {
  cycle: PomodoroCycle;
  secondsLeft: number;
  running: boolean;
  open: boolean;
}

interface PomodoroContextValue extends PomodoroState {
  toggleOpen: () => void;
  toggleRunning: () => void;
  reset: () => void;
  skipCycle: () => void;
}

const INITIAL: PomodoroState = {
  cycle: "work",
  secondsLeft: cycleSeconds("work"),
  running: false,
  open: false,
};

const PomodoroContext = createContext<PomodoroContextValue>({
  ...INITIAL,
  toggleOpen: () => {},
  toggleRunning: () => {},
  reset: () => {},
  skipCycle: () => {},
});

export function usePomodoro() {
  return useContext(PomodoroContext);
}

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PomodoroState>(INITIAL);

  useEffect(() => {
    if (!state.running) return;
    const id = setInterval(() => {
      setState((prev) => ({ ...prev, ...tick(prev) }));
    }, 1000);
    return () => clearInterval(id);
  }, [state.running]);

  const toggleOpen = useCallback(() => {
    setState((prev) => ({ ...prev, open: !prev.open }));
  }, []);
  const toggleRunning = useCallback(() => {
    setState((prev) => ({ ...prev, running: !prev.running }));
  }, []);
  const reset = useCallback(() => {
    setState((prev) => ({ ...prev, running: false, secondsLeft: cycleSeconds(prev.cycle) }));
  }, []);
  const skipCycle = useCallback(() => {
    setState((prev) => {
      const cycle = prev.cycle === "work" ? "rest" : "work";
      return { ...prev, cycle, secondsLeft: cycleSeconds(cycle) };
    });
  }, []);

  return (
    <PomodoroContext.Provider value={{ ...state, toggleOpen, toggleRunning, reset, skipCycle }}>
      {children}
    </PomodoroContext.Provider>
  );
}
