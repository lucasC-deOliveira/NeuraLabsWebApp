import { RotateCcwIcon } from "lucide-react";
import type { ReviewGrade } from "@/lib/srs-local";

// Shared SRS grade selector (again/hard/good/easy) used by the study modals.
const GRADE_BUTTONS: Array<{ grade: ReviewGrade; label: string; sublabel: string; className: string }> = [
  { grade: "again", label: "Errei",   sublabel: "< 1 min",  className: "border-red-500/50 text-red-600 hover:bg-red-500/10 dark:text-red-400" },
  { grade: "hard",  label: "Difícil", sublabel: "~ 10 min", className: "border-orange-500/50 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400" },
  { grade: "good",  label: "Bom",     sublabel: "em breve", className: "border-primary/50 text-primary hover:bg-primary/10" },
  { grade: "easy",  label: "Fácil",   sublabel: "mais dias",className: "border-green-500/50 text-green-600 hover:bg-green-500/10 dark:text-green-400" },
];

export function GradeGrid({ onGrade }: { onGrade: (grade: ReviewGrade) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {GRADE_BUTTONS.map(({ grade, label, sublabel, className }) => (
        <button
          key={grade}
          onClick={() => onGrade(grade)}
          className={`flex flex-col items-center justify-center rounded-lg border bg-card px-2 py-2.5 transition-all ${className}`}
        >
          {grade === "again" && <RotateCcwIcon className="size-3.5 mb-1 opacity-70" />}
          <span className="text-sm font-semibold">{label}</span>
          <span className="mt-0.5 text-[10px] opacity-60">{sublabel}</span>
        </button>
      ))}
    </div>
  );
}
