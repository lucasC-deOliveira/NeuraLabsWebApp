// Port the settings presentation depends on. The infra/ HTTP adapter implements
// it over @/lib/settings-api (ACL); tests mock the boundary.
import type { AiConfig } from "../../domain/ai-config";

export interface SettingsPort {
  getAiConfig(): Promise<AiConfig | null>;
  saveAiConfig(config: AiConfig): Promise<void>;
}
