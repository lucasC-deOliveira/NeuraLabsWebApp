// ACL over @/lib/settings-api. Only this infra adapter knows the lib boundary.
import { getAccountStorage, getConfigAI, resetConfigAI, saveConfigAI } from "@/lib/settings-api";
import type { AccountStorageUsage } from "@contracts/account-storage";
import type { SettingsPort } from "../../application/ports/settings.port";
import type { AiConfig } from "../../domain/ai-config";

export class HttpSettingsAdapter implements SettingsPort {
  /** Reads the current account's server usage.
   * @example const usage = await settings.getStorageUsage()
   */
  getStorageUsage(): Promise<AccountStorageUsage> {
    return getAccountStorage();
  }

  getAiConfig(): Promise<AiConfig | null> {
    return getConfigAI();
  }

  async saveAiConfig(config: AiConfig): Promise<void> {
    await saveConfigAI(config);
  }

  /** Clears the account-specific provider override.
   * @example await settings.resetAiConfig()
   */
  async resetAiConfig(): Promise<void> {
    await resetConfigAI();
  }
}
