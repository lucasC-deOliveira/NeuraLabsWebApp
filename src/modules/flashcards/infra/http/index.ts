// Default composition of the flashcards HTTP adapter. Presentation injects this
// singleton (or a fake port in tests).
import { HttpFlashcardsAdapter } from "./flashcards-http.adapter";
import { HttpFlashcardGenAdapter } from "./flashcard-gen.adapter";
import type { FlashcardsPort } from "../../application/ports/flashcards.port";
import type { FlashcardGenPort } from "../../application/ports/flashcard-gen.port";

export { HttpFlashcardsAdapter } from "./flashcards-http.adapter";

export const flashcardsHttp: FlashcardsPort = new HttpFlashcardsAdapter();
export const flashcardGenHttp: FlashcardGenPort = new HttpFlashcardGenAdapter();

// Concept hierarchy adapter (shared content module) — used by the manual editor.
export { contentHttp } from "@/modules/content";
