// Default composition of the settings HTTP adapter. Presentation injects this
// singleton (or a fake port in tests).
import { HttpSettingsAdapter } from "./settings-http.adapter";
import type { SettingsPort } from "../../application/ports/settings.port";

export { HttpSettingsAdapter } from "./settings-http.adapter";

export const settingsHttp: SettingsPort = new HttpSettingsAdapter();
