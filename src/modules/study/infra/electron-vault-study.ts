import { desktop, isDesktop, type VaultStudyWrite } from "@/lib/vault-bridge";
import { getToken } from "@/lib/api";
import { emptyVaultLibrary, vaultLibrarySchema, type VaultLibrary } from "../domain/vault-library";

export type { VaultCard, VaultDeck, VaultLibrary } from "../domain/vault-library";

/** Resolves the desktop storage already selected in Settings.
 * @example const store = await configuredStudyVault()
 */
export async function configuredStudyVault(): Promise<ElectronVaultStudyStore | null> {
  if (!isDesktop()) return null;
  const folder = await desktop.vault.getPath();
  return folder ? new ElectronVaultStudyStore(folder) : null;
}

/** Selects local storage when configured and reports missing setup before a remote request.
 * @example const port = selectStudyStorage(remote, (vault) => new LocalStore(vault))
 */
export function selectStudyStorage<Port>(
  remote: Port,
  localPort: (vault: ElectronVaultStudyStore) => Port,
  resolveVault: typeof configuredStudyVault = configuredStudyVault,
): <Result>(operation: (port: Port) => Promise<Result>) => Promise<Result> {
  return async <Result>(operation: (port: Port) => Promise<Result>): Promise<Result> => {
    if (!isDesktop() && resolveVault === configuredStudyVault) return operation(remote);
    const vault = await resolveVault();
    if (vault) return operation(localPort(vault));
    if (isDesktop() && !getToken()) throw new Error("No configured vault. Expected: a folder selected in settings");
    return operation(remote);
  };
}

interface VaultStudyFiles {
  readStudy(folder: string): Promise<string | null>;
  writeStudy(update: VaultStudyWrite): Promise<boolean>;
}

function decodeVaultLibrary(serialized: string | null): VaultLibrary {
  if (serialized === null) return emptyVaultLibrary();
  return vaultLibrarySchema.parse(JSON.parse(serialized));
}

export class ElectronVaultStudyStore {
  constructor(readonly folder: string, private readonly files: VaultStudyFiles = desktop.vault) {}

  /** Loads a snapshot from the selected folder.
   * @example const library = await store.read()
   */
  async read(): Promise<VaultLibrary> {
    return decodeVaultLibrary(await this.files.readStudy(this.folder));
  }

  /** Reapplies a change if another save won the race in the main process.
   * @example await store.update(applyReview)
   */
  async update(change: (library: VaultLibrary) => VaultLibrary): Promise<VaultLibrary> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const previous = await this.files.readStudy(this.folder);
      const library = decodeVaultLibrary(previous);
      const next = change(library);
      if (next === library) return library;
      const committed = await this.files.writeStudy({
        folder: this.folder, expected: previous, next: JSON.stringify(vaultLibrarySchema.parse(next), null, 2) + "\n",
      });
      if (committed) return next;
    }
    throw new Error(`Vault "${this.folder}" changed during the write. Expected: a stable study snapshot`);
  }
}
