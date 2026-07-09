import { describe, it, expect } from "vitest";
import {
  initialConceitoEntries,
  toggleConceito,
  addConceito,
  confirmedConceitos,
  type ConceitoPickerEntry,
} from "./prova-conceitos";

describe("initialConceitoEntries", () => {
  it("maps suggestions to pre-selected entries by question number", () => {
    const byNumero = initialConceitoEntries([
      { numero: 91, conceitos: [{ nome: "Esterificação", conceitoId: "c1" }] },
    ]);
    expect(byNumero[91]).toEqual([{ nome: "Esterificação", conceitoId: "c1", selected: true }]);
  });
});

describe("toggleConceito", () => {
  it("flips only the named concept", () => {
    const entries: ConceitoPickerEntry[] = [
      { nome: "A", conceitoId: null, selected: true },
      { nome: "B", conceitoId: null, selected: true },
    ];
    expect(toggleConceito(entries, "A")).toEqual([
      { nome: "A", conceitoId: null, selected: false },
      { nome: "B", conceitoId: null, selected: true },
    ]);
  });
});

describe("addConceito", () => {
  it("appends a new concept, trimmed", () => {
    expect(addConceito([], "  Cinética  ")).toEqual([
      { nome: "Cinética", conceitoId: null, selected: true },
    ]);
  });

  it("ignores blanks and case-insensitive duplicates", () => {
    const entries: ConceitoPickerEntry[] = [{ nome: "Cinética", conceitoId: null, selected: true }];
    expect(addConceito(entries, "  ")).toBe(entries);
    expect(addConceito(entries, "cinética")).toBe(entries);
  });
});

describe("confirmedConceitos", () => {
  it("keeps selected only and drops the flag", () => {
    const entries: ConceitoPickerEntry[] = [
      { nome: "A", conceitoId: "c1", selected: true },
      { nome: "B", conceitoId: null, selected: false },
    ];
    expect(confirmedConceitos(entries)).toEqual([{ nome: "A", conceitoId: "c1" }]);
  });
});
