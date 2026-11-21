import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/link";
import { getToken } from "@/lib/api";
import {
  linkVaultStudyDeck, readVaultStudySyncSettings, runVaultStudySync, setVaultStudySyncEnabled,
  setVaultStudySyncPromptEnabled,
  type VaultStudySyncSettings,
} from "@/modules/study/infra/configured-vault-study-sync";

export function VaultStudySyncControls({ folder }: { folder: string }) {
  const [settings, setSettings] = useState<VaultStudySyncSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const signedIn = Boolean(getToken());

  useEffect(() => {
    let active = true;
    readVaultStudySyncSettings(folder)
      .then((loaded) => { if (active) setSettings(loaded); })
      .catch(() => { if (active) setFailure("Não foi possível ler as preferências de sincronização do vault."); });
    return () => { active = false; };
  }, [folder]);

  async function updateSettings(write: () => Promise<void>): Promise<void> {
    setBusy(true);
    setMessage("");
    setFailure("");
    try {
      await write();
      setSettings(await readVaultStudySyncSettings(folder));
    } catch {
      setFailure("Não foi possível salvar a preferência. Para vincular, escolha um baralho baixado desta conta.");
    } finally {
      setBusy(false);
    }
  }

  async function synchronize(): Promise<void> {
    setBusy(true);
    setMessage("");
    setFailure("");
    try {
      const result = await runVaultStudySync(folder);
      setMessage(`${result.confirmed} revisão(ões) confirmada(s), ${result.updated} agendamento(s) recebido(s), ${result.pending} pendente(s).`);
    } catch {
      setFailure("Não foi possível concluir a sincronização. Confira a conta e a conexão. Revisões pendentes ficam no vault.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={settings?.enabled ?? false} disabled={!settings || busy}
          onChange={(event) => {
            const enabled = event.target.checked;
            void updateSettings(() => setVaultStudySyncEnabled(folder, enabled));
          }} />
        Sincronizar com o servidor
      </label>
      {settings?.enabled && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.promptEnabled} disabled={busy}
            onChange={(event) => {
              const enabled = event.target.checked;
              void updateSettings(() => setVaultStudySyncPromptEnabled(folder, enabled));
            }} />
          Mostrar aviso de sincronização
        </label>
      )}
      {settings?.enabled && (
        <VaultSyncDeckChoices
          settings={settings}
          busy={busy}
          signedIn={signedIn}
          toggleDeck={(id, selected) => updateSettings(() => linkVaultStudyDeck(folder, id, selected))}
          synchronize={synchronize}
        />
      )}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
    </div>
  );
}

function VaultSyncDeckChoices({ settings, busy, signedIn, toggleDeck, synchronize }: {
  settings: VaultStudySyncSettings;
  busy: boolean;
  signedIn: boolean;
  toggleDeck: (id: string, selected: boolean) => Promise<void>;
  synchronize: () => Promise<void>;
}) {
  const hasLinkedDeck = settings.decks.some((deck) => deck.linked);
  return (
    <div className="space-y-2 text-sm">
      <p className="text-muted-foreground">Selecione os baralhos baixados para enviar revisões e receber agendamentos.</p>
      {!signedIn && <Link href="/login?callbackUrl=%2Fsettings%2Fdesktop" className="text-primary underline">Entrar no servidor</Link>}
      <ul className="space-y-1">
        {settings.decks.map((deck) => (
          <li key={deck.id}>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={deck.linked} disabled={busy || (!signedIn && !deck.linked)}
                onChange={(event) => { void toggleDeck(deck.id, event.target.checked); }} />
              {deck.title}
            </label>
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" variant="outline" disabled={!signedIn || !hasLinkedDeck || busy} onClick={synchronize}>
        Sincronizar agora
      </Button>
    </div>
  );
}
