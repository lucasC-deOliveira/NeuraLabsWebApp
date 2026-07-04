"use client";

import { CalendarDaysIcon, BookOpenIcon, BarChart3Icon, TrendingUpIcon } from "lucide-react";
import type { FlashcardStats } from "../../domain/services/flashcard-filters";

function StatCard({ icon: Icon, iconColor, iconBg, value, label }: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 flex items-center gap-2.5">
      <div className={`p-1.5 rounded-md ${iconBg} ${iconColor}`}>
        <Icon className="size-3.5" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-[10px] text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

export function FlashcardsStatsBar({ stats }: { stats: FlashcardStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <StatCard icon={CalendarDaysIcon} iconColor="text-red-500" iconBg="bg-red-100 dark:bg-red-900/30" value={String(stats.overdue)} label="Atrasados" />
      <StatCard icon={BookOpenIcon} iconColor="text-orange-500" iconBg="bg-orange-100 dark:bg-orange-900/30" value={String(stats.due)} label="Para hoje" />
      <StatCard icon={BarChart3Icon} iconColor="text-yellow-600" iconBg="bg-yellow-100 dark:bg-yellow-900/30" value={String(stats.newCount)} label="Iniciando" />
      <StatCard icon={TrendingUpIcon} iconColor="text-emerald-500" iconBg="bg-emerald-100 dark:bg-emerald-900/30" value={String(stats.mastered)} label="Dominados" />
    </div>
  );
}
