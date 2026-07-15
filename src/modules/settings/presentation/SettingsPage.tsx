"use client";

import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { Link } from "@/components/link";
import { ChevronRightIcon } from "lucide-react";
import { isDesktop } from "@/lib/vault-bridge";
import { visibleSections, type SettingsSection } from "../domain/settings-sections";
import { SECTION_ICONS } from "./constants/section-icons";

// Lista de ajustes no estilo do Android: cada entrada mostra o que tem dentro e
// abre a própria tela, em vez de empilhar tudo numa página só.
function SectionRow({ section }: { section: SettingsSection }) {
  const Icon = SECTION_ICONS[section.icon];
  return (
    <Link
      href={`/settings/${section.id}`}
      className="flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon className="size-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{section.titulo}</p>
        <p className="truncate text-xs text-muted-foreground">{section.resumo}</p>
      </div>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function SettingsPage() {
  const sections = visibleSections(isDesktop());

  return (
    <PageContainer className="space-y-6">
      <PageHeader title="Configuracoes" subtitle="Personalize a aparencia e configure a API de IA." />
      <div className="space-y-2">
        {sections.map((section) => (
          <SectionRow key={section.id} section={section} />
        ))}
      </div>
    </PageContainer>
  );
}
