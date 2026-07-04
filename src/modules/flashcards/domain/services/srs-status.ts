// Pure spaced-repetition status derivations for a flashcard's next-review date.
import type { SpacedRepetition } from "../flashcard.types";

const HOUR_MS = 3_600_000;

export interface RelativeTime {
  text: string;
  severe: boolean;
}

/** Humanizes the distance from `now` to a review date (pt-BR, abbreviated). */
export function formatDistanceToNow(date: Date, now: Date = new Date()): RelativeTime {
  const diffHours = Math.round((date.getTime() - now.getTime()) / HOUR_MS);
  if (diffHours < -48) return { text: `Atrasado ${Math.ceil(Math.abs(diffHours) / 24)}d`, severe: true };
  if (diffHours < -24) return { text: "1d atrasado", severe: true };
  if (diffHours < 0) return { text: "Atrasado", severe: true };
  if (diffHours === 0) return { text: "Hoje", severe: false };
  if (diffHours < 24) return { text: `${diffHours}h`, severe: false };
  if (diffHours < 168) return { text: `${Math.floor(diffHours / 24)}d`, severe: false };
  return { text: `${Math.floor(diffHours / 168)}sem`, severe: false };
}

/** Whether the next review is in the past. */
export function isOverdue(sr: SpacedRepetition, now: Date = new Date()): boolean {
  return new Date(sr.proximaRevisao) < now;
}

/** Whether the card is due within the next 24h (or already overdue). */
export function isDue(sr: SpacedRepetition, now: Date = new Date()): boolean {
  const diffHours = (new Date(sr.proximaRevisao).getTime() - now.getTime()) / HOUR_MS;
  return diffHours <= 24;
}

/** 5-slot ease bar: booleans marking how many slots are filled (1..5). */
export function getEaseBar(ease: number): boolean[] {
  const level = Math.max(1, Math.min(5, ease));
  return Array.from({ length: 5 }, (_, i) => i < level);
}
