import { describe, it, expect } from "vitest";
import { previewSchedule, formatDelay } from "./srs-preview";
import type { LocalSchedule } from "./srs-local";

const NOW = new Date("2026-07-15T12:00:00.000Z");

const minutesFromNow = (iso: string): number =>
  Math.round((new Date(iso).getTime() - NOW.getTime()) / 60_000);

const schedule = (over: Partial<LocalSchedule> = {}): LocalSchedule => ({
  fase: "REVIEW",
  learningStep: 0,
  intervalo: 12,
  fatorEase: 2.5,
  dificuldade: 3,
  proximaRevisao: NOW.toISOString(),
  ultimaRevisao: NOW.toISOString(),
  ...over,
});

// O ponto da preview: dizer no botão o que aquele grade fará com ESTE card agora.
// Os números abaixo são o que o algoritmo realmente agenda — foi a divergência
// entre eles e os rótulos fixos ("Difícil ~ 10 min") que originou o bug.
describe("previewSchedule: card novo", () => {
  it("again e hard repetem o primeiro passo de aprendizado: 1 min", () => {
    expect(minutesFromNow(previewSchedule("again", null, NOW).proximaRevisao)).toBe(1);
    expect(minutesFromNow(previewSchedule("hard", null, NOW).proximaRevisao)).toBe(1);
  });

  it("good avança para o segundo passo: 10 min", () => {
    expect(minutesFromNow(previewSchedule("good", null, NOW).proximaRevisao)).toBe(10);
  });

  it("easy gradua o card: 4 dias", () => {
    expect(minutesFromNow(previewSchedule("easy", null, NOW).proximaRevisao)).toBe(4 * 24 * 60);
  });
});

describe("previewSchedule: card maduro", () => {
  const maduro = schedule({ fase: "REVIEW", intervalo: 12, fatorEase: 2.5 });

  it("again derruba para reaprender em 1 min", () => {
    expect(minutesFromNow(previewSchedule("again", maduro, NOW).proximaRevisao)).toBe(1);
  });

  it("hard estende pouco; good usa o ease; easy usa o bônus", () => {
    const dias = (g: "hard" | "good" | "easy"): number =>
      minutesFromNow(previewSchedule(g, maduro, NOW).proximaRevisao) / (24 * 60);
    expect(dias("hard")).toBe(14); // 12 * 1.2
    expect(dias("good")).toBe(30); // 12 * 2.5
    expect(dias("easy")).toBe(39); // 12 * 2.5 * 1.3
  });
});

// Sem isto o rótulo do botão mudaria a cada render (fuzz é aleatório) — e um
// rótulo que dança é tão inútil quanto um que mente.
describe("previewSchedule é determinístico", () => {
  it("dá sempre a mesma resposta para o mesmo card, apesar do fuzz do agendamento", () => {
    const maduro = schedule({ intervalo: 30 });
    const previsoes = Array.from({ length: 20 }, () => previewSchedule("good", maduro, NOW).proximaRevisao);
    expect(new Set(previsoes).size).toBe(1);
  });
});

describe("previewSchedule não grava nada", () => {
  it("devolve um estado novo sem tocar no que recebeu", () => {
    const original = schedule({ intervalo: 12, fatorEase: 2.5 });
    const copia = { ...original };
    previewSchedule("easy", original, NOW);
    expect(original).toEqual(copia);
  });
});

describe("formatDelay", () => {
  const emMinutos = (min: number): string =>
    formatDelay(new Date(NOW.getTime() + min * 60_000).toISOString(), NOW);

  it("mostra minutos abaixo de uma hora", () => {
    expect(emMinutos(1)).toBe("1 min");
    expect(emMinutos(10)).toBe("10 min");
    expect(emMinutos(59)).toBe("59 min");
  });

  it("mostra horas, depois dias, depois meses", () => {
    expect(emMinutos(60)).toBe("1 h");
    expect(emMinutos(60 * 5)).toBe("5 h");
    expect(emMinutos(60 * 24)).toBe("1 dia");
    expect(emMinutos(60 * 24 * 4)).toBe("4 dias");
    expect(emMinutos(60 * 24 * 45)).toBe("2 meses");
    expect(emMinutos(60 * 24 * 400)).toBe("1,1 ano");
  });

  // O card vencido é o caso normal ao abrir a sessão: não faz sentido "-3 min".
  it("trata o que já venceu como agora", () => {
    expect(emMinutos(-3)).toBe("agora");
    expect(emMinutos(0)).toBe("agora");
  });

  it("arredonda os segundos para o minuto mais próximo, nunca para zero", () => {
    expect(formatDelay(new Date(NOW.getTime() + 40_000).toISOString(), NOW)).toBe("1 min");
  });
});
