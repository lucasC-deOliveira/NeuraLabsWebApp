"use client";

import { PageHeader } from "@/components/page-header/PageHeader";
import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { UploadCloudIcon } from "lucide-react";
import { ManualTab } from "./components/ManualTab";
import { ImportTab } from "./components/ImportTab";

type Mode = "manual" | "import";

export function NewProvaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");

  const handleCreated = (id: string): void => { router.push(`/provas/${id}`); };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <PageHeader title="Nova prova" />

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-6">
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "manual" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Montar manualmente
        </button>
        <button
          onClick={() => setMode("import")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "import" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UploadCloudIcon className="size-3.5" /> Importar arquivo
        </button>
      </div>

      {mode === "manual" ? (
        <ManualTab onCreated={handleCreated} />
      ) : (
        <ImportTab onCreated={handleCreated} />
      )}
    </div>
  );
}
