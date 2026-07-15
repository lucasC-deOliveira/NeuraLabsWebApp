"use client";

import { PageContainer } from "@/components/page-container";
import { PageHeader } from "@/components/page-header/PageHeader";
import { Link } from "@/components/link";
import { Button } from "@/components/ui/button";
import { SettingsIcon } from "lucide-react";
import { useParams } from "@/lib/navigation";
import { isDesktop } from "@/lib/vault-bridge";
import { findSection, type SettingsSectionId } from "../domain/settings-sections";
import { ThemeSection } from "./components/ThemeSection";
import { CardStyleSection } from "./components/CardStyleSection";
import { StudyOrderSection } from "./components/StudyOrderSection";
import { IaSectionBody } from "./components/IaSectionBody";
import { DesktopSectionBody } from "./components/DesktopSectionBody";

// Cada seção monta o SEU estado: abrir "Aparência" não vai buscar config de IA.
const SECTION_BODIES: Record<SettingsSectionId, () => React.ReactElement> = {
  aparencia: ThemeSection,
  flashcards: CardStyleSection,
  estudo: StudyOrderSection,
  ia: IaSectionBody,
  desktop: DesktopSectionBody,
};

function SectionNotFound() {
  return (
    <PageContainer className="py-20 text-center text-muted-foreground">
      <SettingsIcon className="mx-auto mb-4 size-12 text-zinc-300 dark:text-zinc-600" />
      <p className="text-lg font-medium">Seção não encontrada.</p>
      <Link href="/settings">
        <Button variant="link" className="mt-2">Voltar para configuracoes</Button>
      </Link>
    </PageContainer>
  );
}

export function SettingsSectionPage() {
  const { secao } = useParams<{ secao: string }>();
  const section = findSection(secao ?? "", isDesktop());
  if (!section) return <SectionNotFound />;

  const Body = SECTION_BODIES[section.id];
  return (
    <PageContainer className="space-y-6">
      <PageHeader title={section.titulo} subtitle={section.resumo} />
      <div className="space-y-6">
        <Body />
      </div>
    </PageContainer>
  );
}
