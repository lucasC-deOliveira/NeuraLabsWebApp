// Prévia do agendamento: "se eu apertar este botão, quando o card volta?".
// Existe porque os rótulos dos botões eram texto fixo escrito à mão ("Difícil
// ~ 10 min") e não batiam com o algoritmo — num card novo, "Difícil" agenda 1 min
// e quem vale 10 min é o "Bom". Agora o rótulo sai do próprio SM-2: não tem como
// divergir de novo.
import { scheduleCard, type LocalSchedule, type ReviewGrade } from "./srs-local";

// Prever com o fuzz do agendamento devolveria um tempo diferente a cada render
// (ele sorteia ±5%): o rótulo do botão ficaria piscando. A prévia é o valor "limpo".
const semFuzz = (interval: number): number => interval;

/**
 * O que este grade faria com este card, sem gravar nada. `schedule` nulo = card
 * novo (nunca revisado).
 * @example previewSchedule("hard", null, new Date()) // card novo → +1 min
 */
export function previewSchedule(
  grade: ReviewGrade,
  schedule: LocalSchedule | null,
  now: Date = new Date(),
): LocalSchedule {
  return scheduleCard(grade, schedule ?? undefined, now, semFuzz);
}

const MIN_MS = 60_000;

function formatDias(dias: number): string {
  if (dias < 30) return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  const meses = Math.round(dias / 30);
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  // Decimal em português mantém o singular ("1,5 ano"); a partir de 2 vai ao plural.
  const anos = dias / 365;
  return `${anos.toFixed(1).replace(".", ",")} ${anos < 2 ? "ano" : "anos"}`;
}

/**
 * Distância até uma data, curta e em português, para caber no botão.
 * @example formatDelay(daqui10min) // "10 min"
 */
export function formatDelay(iso: string, now: Date = new Date()): string {
  const ms = new Date(iso).getTime() - now.getTime();
  // Card vencido é o caso normal ao abrir a sessão — "-3 min" não diria nada.
  if (ms <= 0) return "agora";
  const minutos = Math.max(1, Math.round(ms / MIN_MS));
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `${horas} h`;
  return formatDias(Math.round(horas / 24));
}
