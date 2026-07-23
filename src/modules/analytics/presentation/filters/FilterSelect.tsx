"use client";

// Dropdown de filtro reutilizável (baralho, prova, …). Some quando não há opções.
export function FilterSelect({
  value,
  onChange,
  allLabel,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: { id: string; label: string }[];
}) {
  if (options.length === 0) return null;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={allLabel}
      className="max-w-[180px] rounded-lg border bg-background px-2.5 py-1.5 text-xs text-foreground"
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
