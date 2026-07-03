// Default composition of the provas HTTP adapter. Presentation injects this
// singleton (or a fake port in tests).
import { HttpProvasAdapter } from "./provas-http.adapter";
import type { ProvasPort } from "../../application/ports/provas.port";

export { HttpProvasAdapter } from "./provas-http.adapter";

export const provasHttp: ProvasPort = new HttpProvasAdapter();
