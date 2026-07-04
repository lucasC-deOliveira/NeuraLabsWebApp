"use client";

import { Label } from "@/components/ui/label";

export function FormField({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={`text-sm font-medium ${error ? "text-red-500" : ""}`}>
        {label} {error && <span className="text-[10px] text-red-400">(obrigatoria)</span>}
      </Label>
      {children}
    </div>
  );
}

const INPUT_CLS = "w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400";

export function FormInput({ label, value, placeholder, error, onChange }: {
  label: string; value: string; placeholder?: string; error?: boolean; onChange: (v: string) => void;
}) {
  return (
    <FormField label={label} error={error}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={INPUT_CLS} />
    </FormField>
  );
}

export function FormTextArea({ label, value, onChange, placeholder, error, minH, accent }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  error?: boolean; minH: number; accent?: "red" | "emerald";
}) {
  const borderClass = error
    ? "border-red-300 dark:border-red-800 focus:ring-red-400"
    : accent === "red"
      ? "border-red-200 dark:border-red-800"
      : accent === "emerald"
        ? "border-emerald-200 dark:border-emerald-800"
        : "border-zinc-200 dark:border-zinc-700";
  return (
    <FormField label={label} error={error}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border ${borderClass} bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none placeholder:text-zinc-400`}
        style={{ minHeight: `${minH}px` }}
      />
    </FormField>
  );
}
