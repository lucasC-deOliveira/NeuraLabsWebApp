"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TargetIcon } from "lucide-react";
import { loadDailyGoal, saveDailyGoal } from "@/components/gamification/gamification-settings";
import { MIN_DAILY_GOAL, MAX_DAILY_GOAL, clampDailyGoal } from "@/components/gamification/daily-goal";

// Alvo diário de revisões — o número que o anel de Progresso persegue. Do aparelho
// (localStorage), como as demais preferências de estudo.
const STEP = 5;

export function DailyGoalSection() {
  const [goal, setGoal] = useState<number>(loadDailyGoal);

  const set = (value: number): void => {
    const clamped = clampDailyGoal(value);
    setGoal(clamped);
    saveDailyGoal(clamped);
  };

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <TargetIcon className="size-5" />
          Meta diária
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Quantas revisões por dia você quer fazer. O anel de Progresso no início persegue
          este número, e bater a meta mantém sua ofensiva.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="daily-goal" className="text-sm font-medium">Revisões por dia</label>
          <span className="text-lg font-bold tabular-nums">{goal}</span>
        </div>
        <input
          id="daily-goal"
          type="range"
          min={MIN_DAILY_GOAL}
          max={MAX_DAILY_GOAL}
          step={STEP}
          value={goal}
          onChange={(e) => set(Number(e.target.value))}
          className="mt-2 w-full accent-primary"
        />
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>{MIN_DAILY_GOAL}</span>
          <span>{MAX_DAILY_GOAL}</span>
        </div>
      </CardContent>
    </Card>
  );
}
