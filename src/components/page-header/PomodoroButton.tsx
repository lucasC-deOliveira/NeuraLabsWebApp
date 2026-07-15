"use client";

import { Button } from "@/components/ui/button";
import { CherryIcon, PlayIcon, PauseIcon, RotateCcwIcon, SkipForwardIcon } from "lucide-react";
import { usePomodoro } from "./PomodoroProvider";
import { CYCLE_LABELS, formatTime } from "./pomodoro";

// O "tomate" do disrupt: um clique abre o timer. Só a UI mora aqui — o tempo corre
// no PomodoroProvider, acima do header, para sobreviver à navegação.
export function PomodoroButton() {
  const { cycle, secondsLeft, running, open, toggleOpen, toggleRunning, reset, skipCycle } =
    usePomodoro();

  return (
    <div className="flex items-center gap-2">
      {open && (
        <div className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-background/60 px-2 py-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {CYCLE_LABELS[cycle]}
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-primary">
            {formatTime(secondsLeft)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0"
            title={running ? "Pausar" : "Iniciar"}
            onClick={toggleRunning}
          >
            {running ? <PauseIcon className="size-3" /> : <PlayIcon className="size-3" />}
          </Button>
          <Button variant="ghost" size="sm" className="size-6 p-0" title="Reiniciar" onClick={reset}>
            <RotateCcwIcon className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="size-6 p-0"
            title="Pular ciclo"
            onClick={skipCycle}
          >
            <SkipForwardIcon className="size-3" />
          </Button>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0 text-primary"
        title={open ? "Esconder o pomodoro" : "Mostrar o pomodoro"}
        onClick={toggleOpen}
      >
        <CherryIcon className="size-5" />
      </Button>
    </div>
  );
}
