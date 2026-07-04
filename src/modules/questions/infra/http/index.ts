// Composição padrão do adapter HTTP de questions. A presentation injeta este
// singleton (ou um fake do port em testes).
import { HttpQuestionsAdapter } from "./questions-http.adapter";
import type { QuestionsPort } from "../../application/ports/questions.port";

export { HttpQuestionsAdapter } from "./questions-http.adapter";

export const questionsHttp: QuestionsPort = new HttpQuestionsAdapter();
