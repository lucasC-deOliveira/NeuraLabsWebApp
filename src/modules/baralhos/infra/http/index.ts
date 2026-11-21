// Default composition of the baralhos HTTP adapter. Presentation injects this
// singleton (or a fake port in tests).
import { HttpBaralhosAdapter } from "./baralhos-http.adapter";
import type { BaralhosPort } from "../../application/ports/baralhos.port";
import { vaultAwareBaralhos } from "../vault-baralhos";

export { HttpBaralhosAdapter } from "./baralhos-http.adapter";

export const remoteBaralhos: BaralhosPort = new HttpBaralhosAdapter();
export const baralhosHttp: BaralhosPort = vaultAwareBaralhos(remoteBaralhos);
