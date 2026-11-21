import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { hasOpenVaultStudyDialog, subscribeVaultStudyDialogs, VAULT_STUDY_CHANGE_EVENT } from "@/lib/vault-study-events";
import { readVaultStudyNotice, synchronizeVaultStudyNotice, type VaultStudyNotice } from "../infra/vault-study-notice";

const BACKEND_PROBE_COOLDOWN_MS = 30_000;

function shouldProbeStudyServer(probe: boolean, reset: boolean, elapsed: number): boolean {
  return probe && navigator.onLine && (reset || elapsed >= BACKEND_PROBE_COOLDOWN_MS);
}

interface VaultStudySyncPromptProps {
  paused?: boolean;
  inspect?: typeof readVaultStudyNotice;
  synchronize?: typeof synchronizeVaultStudyNotice;
}

export function VaultStudySyncPrompt({
  paused = false, inspect = readVaultStudyNotice, synchronize = synchronizeVaultStudyNotice,
}: VaultStudySyncPromptProps) {
  const [notice, setNotice] = useState<VaultStudyNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(false);
  const studyOpen = useSyncExternalStore(subscribeVaultStudyDialogs, hasOpenVaultStudyDialog);
  const deferred = paused || studyOpen;
  const [previouslyDeferred, setPreviouslyDeferred] = useState(deferred);
  const dismissed = useRef<string | null>(null);

  if (deferred !== previouslyDeferred) {
    setPreviouslyDeferred(deferred);
    if (deferred) {
      setNotice(null);
      setFailure(false);
    }
  }

  useEffect(() => {
    if (deferred || busy) return;
    let active = true;
    let generation = 0;
    let backendProbeAt = -Infinity;

    async function check(probe = true, reset = false): Promise<void> {
      const now = performance.now();
      const probeServer = shouldProbeStudyServer(probe, reset, now - backendProbeAt);
      if (probeServer) backendProbeAt = now;
      const invalidatePrevious = probeServer || reset;
      const request = invalidatePrevious ? ++generation : generation;
      const next = await inspect(probeServer).catch(() => undefined);
      if (!active || generation !== request || next === undefined) return;
      if (next) {
        generation += 1;
        setNotice(next.fingerprint === dismissed.current ? null : next);
      }
      else if (invalidatePrevious) setNotice(null);
    }

    const onFocus = (): void => { void check(); };
    const onOnline = (): void => { void check(true, true); };
    const onVaultChange = (event: Event): void => {
      const reason = (event as CustomEvent<string>).detail;
      void check(reason === "settings", reason !== "review");
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    window.addEventListener(VAULT_STUDY_CHANGE_EVENT, onVaultChange);
    void check();
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener(VAULT_STUDY_CHANGE_EVENT, onVaultChange);
    };
  }, [busy, inspect, deferred]);

  function dismiss(): void {
    if (notice) dismissed.current = notice.fingerprint;
    setFailure(false);
    setNotice(null);
  }

  async function confirm(): Promise<void> {
    if (!notice) return;
    setBusy(true);
    setFailure(false);
    try {
      const result = await synchronize(notice);
      dismiss();
      toast.success(`Sincronização concluída. ${result.pending} revisão(ões) pendente(s).`);
    } catch {
      setFailure(true);
    } finally {
      setBusy(false);
    }
  }

  if (deferred || !notice) return null;
  return <SyncNoticeBanner notice={notice} busy={busy} failure={failure} onDismiss={dismiss} onConfirm={confirm} />;
}

function SyncNoticeBanner({ notice, busy, failure, onDismiss, onConfirm }: {
  notice: VaultStudyNotice;
  busy: boolean;
  failure: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
}) {
  const needsLink = notice.kind === "unlinked-reviews";
  const action = needsLink ? "Vincular e sincronizar" : "Sincronizar agora";
  const failureMessage = needsLink
    ? "Não foi possível vincular e sincronizar. Confira a conexão e se o baralho pertence à conta conectada."
    : "Não foi possível sincronizar. Tente novamente quando a API estiver disponível.";
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex justify-center px-3">
      <section aria-label="Alterações para sincronizar"
        className="pointer-events-auto w-full max-w-xl space-y-2 rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg">
        <h2 className="font-semibold">Alterações para sincronizar</h2>
        <p role="status" className="text-muted-foreground">{noticeDescription(notice)}</p>
        {failure && <p role="alert" className="text-destructive">{failureMessage}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={onDismiss}>Depois</Button>
          <Button size="sm" disabled={busy} onClick={onConfirm}>{busy ? "Sincronizando…" : action}</Button>
        </div>
      </section>
    </div>
  );
}

function noticeDescription(notice: VaultStudyNotice): string {
  if (notice.kind === "unlinked-reviews") {
    return "Há revisões salvas neste baralho. Vincule-o ao servidor para enviá-las.";
  }
  if (notice.kind === "local-reviews") {
    return notice.count === 1 ? "Uma revisão do vault está pronta para enviar."
      : `${notice.count} revisões do vault estão prontas para enviar.`;
  }
  return notice.count === 1 ? "Há um agendamento atualizado no servidor."
    : `Há ${notice.count} agendamentos atualizados no servidor.`;
}
