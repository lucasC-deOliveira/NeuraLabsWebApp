import { scheduleCard, updateSrsLog, type ReviewGrade, type LocalSchedule } from "@/lib/srs-local";
import { announceVaultStudyChange } from "@/lib/vault-study-events";

/** Records a planned card once even when advancing the plan has to be retried.
 * @example await gradeVaultPlannedCard(folder, sessionId, cardId, "good")
 */
export async function gradeVaultPlannedCard(
  folder: string, sessionId: string, cardId: string, grade: ReviewGrade, baseline?: LocalSchedule,
): Promise<void> {
  const id = `${sessionId}-${cardId}`;
  const saved = await updateSrsLog(folder, (log) => {
    if (log.sessions.some((entry) => entry.id === id)) return false;
    const now = new Date();
    const time = now.toISOString();
    log.schedule[cardId] = scheduleCard(grade, log.schedule[cardId] ?? baseline, now);
    log.sessions.push({
      id, startedAt: time, endedAt: time, baralhoId: null, catalog: true,
      revisoes: [{ flashcardId: cardId, grade, revisadoEm: time, tempoResposta: 0 }],
    });
    return true;
  }, (changed) => changed);
  if (saved) announceVaultStudyChange("review");
}
