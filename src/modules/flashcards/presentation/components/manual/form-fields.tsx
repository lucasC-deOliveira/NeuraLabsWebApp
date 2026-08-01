"use client";

import type { Control } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { ManualCardFormValues } from "../../../domain/services/manual-card-schema";

export type ManualControl = Control<ManualCardFormValues>;

/** Text leaves of the form model — `itens` is handled apart, via useFieldArray. */
export type ManualTextName = keyof Omit<ManualCardFormValues, "itens">;

// O estado de erro chega ao controle como aria-invalid (injetado pelo FormControl),
// então a borda vermelha sai de variante Tailwind em vez de prop booleana.
const INVALID_CLS = "aria-[invalid=true]:border-red-300 dark:aria-[invalid=true]:border-red-800 aria-[invalid=true]:focus:ring-red-400";

export const MANUAL_INPUT_CLS = `w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400 ${INVALID_CLS}`;

interface ManualFieldProps {
  control: ManualControl;
  name: ManualTextName;
  label: string;
  placeholder?: string;
}

export function ManualInputField({ control, name, label, placeholder }: ManualFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <input {...field} placeholder={placeholder} className={MANUAL_INPUT_CLS} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

const ACCENT_CLS = {
  red: "border-red-200 dark:border-red-800",
  emerald: "border-emerald-200 dark:border-emerald-800",
  none: "border-zinc-200 dark:border-zinc-700",
} as const;

interface ManualTextAreaProps extends ManualFieldProps {
  minH: number;
  accent?: "red" | "emerald";
}

export function ManualTextAreaField({ control, name, label, placeholder, minH, accent }: ManualTextAreaProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="space-y-1.5">
          <FormLabel className="text-sm font-medium">{label}</FormLabel>
          <FormControl>
            <textarea
              {...field}
              placeholder={placeholder}
              className={`w-full rounded-md border ${ACCENT_CLS[accent ?? "none"]} bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400 ${INVALID_CLS}`}
              style={{ minHeight: `${minH}px` }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
