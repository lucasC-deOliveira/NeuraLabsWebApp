"use client";

import { LayersIcon, BrainIcon, EyeIcon, BarChart3Icon } from "lucide-react";
import type { NotesStats } from "../../domain/services/nota-filters";

function StatCard({ icon: Icon, iconColor, iconBg, value, label }: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-card px-3 py-2.5">
      <div className={`size-8 rounded-md flex items-center justify-center ${iconBg}`}>
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold tabular-nums">{value}</div>
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

export function NotesStatsBar({ stats }: { stats: NotesStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <StatCard icon={LayersIcon} iconColor="text-violet-500" iconBg="bg-violet-100 dark:bg-violet-900/30" value={String(stats.conceptCount)} label="Conceitos" />
      <StatCard icon={BrainIcon} iconColor="text-emerald-500" iconBg="bg-emerald-100 dark:bg-emerald-900/30" value={String(stats.withFc)} label="Com flashcards" />
      <StatCard icon={EyeIcon} iconColor="text-amber-500" iconBg="bg-amber-100 dark:bg-amber-900/30" value={String(stats.noFc)} label="Sem flashcards" />
      <StatCard icon={BarChart3Icon} iconColor="text-sky-500" iconBg="bg-sky-100 dark:bg-sky-900/30" value={stats.totalWords.toLocaleString("pt-BR")} label="Palavras" />
    </div>
  );
}
