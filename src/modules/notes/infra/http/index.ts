// Default composition of the notes HTTP adapters. Presentation injects these
// singletons (or fakes in tests). The concept hierarchy adapter lives in the
// shared content module.
import { HttpNotesAdapter } from "./notes-http.adapter";
import { HttpNotaAiAdapter } from "./nota-ai-http.adapter";
import type { NotesPort } from "../../application/ports/notes.port";
import type { NotaAiPort } from "../../application/ports/nota-ai.port";

export { contentHttp } from "@/modules/content";

export const notesHttp: NotesPort = new HttpNotesAdapter();
export const notaAiHttp: NotaAiPort = new HttpNotaAiAdapter();
