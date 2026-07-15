// Default composition of the baralhos HTTP adapter. Presentation injects this
// singleton (or a fake port in tests).
import { HttpBaralhosAdapter } from "./baralhos-http.adapter";
import type { BaralhosPort } from "../../application/ports/baralhos.port";

export { HttpBaralhosAdapter } from "./baralhos-http.adapter";

export const baralhosHttp: BaralhosPort = new HttpBaralhosAdapter();
