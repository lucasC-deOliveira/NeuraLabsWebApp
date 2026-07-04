// Default composition of the content HTTP adapter (concept hierarchy CRUD).
// Presentation/use-cases inject this singleton (or a fake port in tests).
import { HttpContentAdapter } from "./content-http.adapter";
import type { ContentPort } from "../../application/ports/content.port";

export { HttpContentAdapter } from "./content-http.adapter";

export const contentHttp: ContentPort = new HttpContentAdapter();
