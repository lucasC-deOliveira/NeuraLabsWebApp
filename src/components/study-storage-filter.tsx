import { Button } from "@/components/ui/button";
import type { StorageFilter } from "@/lib/study-storage-filter";

const STORAGE_OPTIONS: Array<{ id: StorageFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "vault", label: "Vault" },
  { id: "server", label: "Servidor" },
];

interface StudyStorageFilterProps {
  value: StorageFilter;
  onChange: (value: StorageFilter) => void;
}

export function StudyStorageFilter({ value, onChange }: StudyStorageFilterProps) {
  return (
    <div role="group" aria-label="Origem dos dados" className="flex flex-wrap gap-1.5">
      {STORAGE_OPTIONS.map(({ id, label }) => (
        <Button type="button" key={id} size="sm" variant={value === id ? "default" : "outline"}
          aria-pressed={value === id} onClick={() => onChange(id)}>
          {label}
        </Button>
      ))}
    </div>
  );
}

export function StudyStorageLabel({ storage, availableOnServer }: {
  storage?: "vault";
  availableOnServer?: boolean;
}) {
  const label = storage === "vault" ? (availableOnServer ? "Vault e servidor" : "Vault") : "Servidor";
  return <span className="text-[10px] text-muted-foreground">{label}</span>;
}
