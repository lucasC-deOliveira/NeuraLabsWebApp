import { useState, type ReactElement } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/link";
import { desktop } from "@/lib/vault-bridge";
import type { LibraryFile } from "./LibraryShelf";

/** Opens the desktop file picker and reports the imported book to the shelf. */
export function AddLibraryBook({ onAdded }: { onAdded: (book: LibraryFile) => void }): ReactElement {
  const [importing, setImporting] = useState(false);
  const [requiresVault, setRequiresVault] = useState(false);

  const add = async (): Promise<void> => {
    setImporting(true);
    try {
      const vault = await desktop.vault.getPath();
      setRequiresVault(!vault);
      if (!vault) return;
      const book = await desktop.vault.importLibraryPdf();
      if (!book) return;
      onAdded(book);
      toast.success("Livro adicionado à biblioteca.");
    } catch {
      toast.error("Não foi possível adicionar o livro. Confira se o arquivo é um PDF válido e se o vault permite gravação.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => void add()} disabled={importing}>
        <PlusIcon /> {importing ? "Adicionando…" : "Adicionar livro"}
      </Button>
      {requiresVault && <Link href="/settings" className="text-sm underline">Selecione um vault nas Configurações.</Link>}
    </div>
  );
}
