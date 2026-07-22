// Composição padrão do adapter de analytics. Presentation injeta este singleton
// (ou um fake do port em testes).
import { HttpAnalyticsAdapter } from "./analytics-http.adapter";
import type { AnalyticsPort } from "../../application/ports/analytics.port";

export { HttpAnalyticsAdapter } from "./analytics-http.adapter";

export const analyticsHttp: AnalyticsPort = new HttpAnalyticsAdapter();
