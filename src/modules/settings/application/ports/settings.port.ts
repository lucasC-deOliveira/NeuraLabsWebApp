// Port the settings presentation depends on. The infra/ HTTP adapter implements
// it over @/lib/settings-api (ACL); tests mock the boundary.
import type { AiConfig } from "../../domain/ai-config";
import type { AccountStorageUsage } from "@contracts/account-storage";

export interface AccountStorageReader {
  getStorageUsage(): Promise<AccountStorageUsage>;
}

export interface SettingsPort extends AccountStorageReader {
  getAiConfig(): Promise<AiConfig | null>;
  saveAiConfig(config: AiConfig): Promise<void>;
  resetAiConfig(): Promise<void>;
}
