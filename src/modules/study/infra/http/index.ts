// Default composition of the study-session HTTP adapter. Presentation injects
// this singleton (or a fake port in tests).
import { HttpStudySessionAdapter } from "./study-http.adapter";
import type { StudySessionPort } from "../../application/ports/study-session.port";

export { HttpStudySessionAdapter } from "./study-http.adapter";

export const studySessionHttp: StudySessionPort = new HttpStudySessionAdapter();
