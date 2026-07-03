// Default composition of the notes HTTP adapters. Presentation injects these
// singletons (or fakes in tests).
import { HttpNotesAdapter } from "./notes-http.adapter";
import { HttpNotaAiAdapter } from "./nota-ai-http.adapter";
import { HttpContentAdapter } from "./content-http.adapter";
import type { NotesPort } from "../../application/ports/notes.port";
import type { NotaAiPort } from "../../application/ports/nota-ai.port";
import type { ContentPort } from "../../application/ports/content.port";

export const notesHttp: NotesPort = new HttpNotesAdapter();
export const notaAiHttp: NotaAiPort = new HttpNotaAiAdapter();
export const contentHttp: ContentPort = new HttpContentAdapter();
