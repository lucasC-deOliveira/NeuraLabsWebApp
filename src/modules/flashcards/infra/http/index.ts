// Default composition of the flashcards HTTP adapter. Presentation injects this
// singleton (or a fake port in tests).
import { HttpFlashcardsAdapter } from "./flashcards-http.adapter";
import type { FlashcardsPort } from "../../application/ports/flashcards.port";

export { HttpFlashcardsAdapter } from "./flashcards-http.adapter";

export const flashcardsHttp: FlashcardsPort = new HttpFlashcardsAdapter();
