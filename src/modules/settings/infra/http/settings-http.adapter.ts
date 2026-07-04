// ACL over @/lib/settings-api. Only this infra adapter knows the lib boundary.
import { getConfigAI, saveConfigAI } from "@/lib/settings-api";
import type { SettingsPort } from "../../application/ports/settings.port";
import type { AiConfig } from "../../domain/ai-config";

export class HttpSettingsAdapter implements SettingsPort {
  getAiConfig(): Promise<AiConfig | null> {
    return getConfigAI();
  }

  async saveAiConfig(config: AiConfig): Promise<void> {
    await saveConfigAI(config);
  }
}
