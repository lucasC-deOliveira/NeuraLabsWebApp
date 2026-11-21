export const VAULT_STUDY_CHANGE_EVENT = "neuralabs:vault-study-changed";

const openStudyDialogs = new Set<symbol>();
const studyDialogListeners = new Set<() => void>();

/** Registers one open study dialog so the global notice waits until it closes.
 * @example const close = openVaultStudyDialog()
 */
export function openVaultStudyDialog(): () => void {
  const dialog = Symbol("vault-study-dialog");
  openStudyDialogs.add(dialog);
  studyDialogListeners.forEach((listener) => listener());
  return () => {
    if (!openStudyDialogs.delete(dialog)) return;
    studyDialogListeners.forEach((listener) => listener());
  };
}

/** Reads whether a study dialog is open.
 * @example const studying = hasOpenVaultStudyDialog()
 */
export function hasOpenVaultStudyDialog(): boolean {
  return openStudyDialogs.size > 0;
}

/** Subscribes to the lifecycle of the existing study dialogs.
 * @example const unsubscribe = subscribeVaultStudyDialogs(onChange)
 */
export function subscribeVaultStudyDialogs(onChange: () => void): () => void {
  studyDialogListeners.add(onChange);
  return () => { studyDialogListeners.delete(onChange); };
}

/** Rechecks sync status after a durable review, preference change, or sync.
 * @example announceVaultStudyChange("review")
 */
export function announceVaultStudyChange(reason: "review" | "settings" | "synchronized"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VAULT_STUDY_CHANGE_EVENT, { detail: reason }));
}
