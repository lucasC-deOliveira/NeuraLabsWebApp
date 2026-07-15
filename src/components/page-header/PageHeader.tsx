"use client";

import {
  BrainIcon,
  LayersIcon,
  LibraryIcon,
  HelpCircleIcon,
  ClipboardListIcon,
  FileTextIcon,
  FlameIcon,
  NetworkIcon,
  SettingsIcon,
  ArrowLeftIcon,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/lib/navigation";
import { resolveCrumbs, shouldShowBack, type CrumbIcon } from "./header-crumbs";
import { PomodoroButton } from "./PomodoroButton";

const CRUMB_ICONS: Record<CrumbIcon, LucideIcon> = {
  home: BrainIcon,
  flashcards: LayersIcon,
  baralhos: LibraryIcon,
  questions: HelpCircleIcon,
  provas: ClipboardListIcon,
  notes: FileTextIcon,
  study: FlameIcon,
  graph: NetworkIcon,
  settings: SettingsIcon,
};

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  // Botões da página (ex.: "Novo flashcard"). Ficam no header, junto do título —
  // no disrupt o título ficava solto e as ações espalhadas pela página.
  actions?: React.ReactNode;
}

function Crumbs({ pathname }: { pathname: string }) {
  const crumbs = resolveCrumbs(pathname);
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Trilha" className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
      {crumbs.map((crumb, i) => {
        const Icon = CRUMB_ICONS[crumb.icon];
        return (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <Link href={crumb.href} className="flex items-center gap-1 hover:text-primary">
              <Icon className="size-3" />
              {crumb.name}
            </Link>
            {i < crumbs.length - 1 && <span aria-hidden="true">/</span>}
          </span>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="app-page-header mb-6 rounded-xl border border-primary/40 bg-card/80 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {shouldShowBack(pathname) && (
              <Button
                variant="outline"
                size="sm"
                className="size-7 shrink-0 rounded-full border-primary/50 p-0 text-primary"
                title="Voltar"
                aria-label="Voltar"
                onClick={() => router.back()}
              >
                <ArrowLeftIcon className="size-3.5" />
              </Button>
            )}
            <Crumbs pathname={pathname} />
          </div>
          <h1 className="mt-2 truncate font-heading text-2xl font-semibold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {actions}
          <PomodoroButton />
        </div>
      </div>
    </header>
  );
}
