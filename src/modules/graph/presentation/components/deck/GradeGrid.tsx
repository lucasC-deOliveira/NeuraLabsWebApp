import { RotateCcwIcon } from "lucide-react";
import type { ReviewGrade, LocalSchedule } from "@/lib/srs-local";
import { previewSchedule, formatDelay } from "@/lib/srs-preview";

// Seletor de nota (again/hard/good/easy) compartilhado pelos modais de estudo.
//
// O tempo embaixo de cada botão sai do PRÓPRIO SM-2, para este card, agora. Já foi
// texto fixo — "Difícil ~ 10 min" — e mentia: num card novo "Difícil" repete o
// primeiro passo (1 min) e quem vale 10 min é o "Bom". Rótulo escrito à mão diverge
// do algoritmo assim que alguém mexe num dos dois; calculado, não tem como.
const GRADE_BUTTONS: Array<{ grade: ReviewGrade; label: string; className: string }> = [
  { grade: "again", label: "Errei",   className: "border-red-500/50 text-red-600 hover:bg-red-500/10 dark:text-red-400" },
  { grade: "hard",  label: "Difícil", className: "border-orange-500/50 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400" },
  { grade: "good",  label: "Bom",     className: "border-primary/50 text-primary hover:bg-primary/10" },
  { grade: "easy",  label: "Fácil",   className: "border-green-500/50 text-green-600 hover:bg-green-500/10 dark:text-green-400" },
];

interface GradeGridProps {
  onGrade: (grade: ReviewGrade) => void;
  // Agendamento atual do card; null = card novo (nunca revisado).
  schedule?: LocalSchedule | null;
}

export function GradeGrid({ onGrade, schedule = null }: GradeGridProps) {
  // Uma referência de tempo só para os 4 botões: com uma por botão, "1 min" e
  // "10 min" seriam medidos de instantes diferentes.
  const now = new Date();

  return (
    <div className="grid grid-cols-4 gap-2">
      {GRADE_BUTTONS.map(({ grade, label, className }) => (
        <button
          key={grade}
          onClick={() => onGrade(grade)}
          className={`flex flex-col items-center justify-center rounded-lg border bg-card px-2 py-2.5 transition-all ${className}`}
        >
          {grade === "again" && <RotateCcwIcon className="size-3.5 mb-1 opacity-70" />}
          <span className="text-sm font-semibold">{label}</span>
          <span className="mt-0.5 text-[10px] opacity-60">
            {formatDelay(previewSchedule(grade, schedule, now).proximaRevisao, now)}
          </span>
        </button>
      ))}
    </div>
  );
}
