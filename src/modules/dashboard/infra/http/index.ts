// Default composition of the dashboard HTTP adapter. Presentation injects this
// singleton (or a fake port in tests).
import { HttpDashboardAdapter } from "./dashboard-http.adapter";
import type { DashboardPort } from "../../application/ports/dashboard.port";

export { HttpDashboardAdapter } from "./dashboard-http.adapter";

export const dashboardHttp: DashboardPort = new HttpDashboardAdapter();
