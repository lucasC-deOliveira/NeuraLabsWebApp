import { NotaSection } from "../entities/nota-section";
import { NotaDefinition } from "../value-objects/nota-definition";

/**
 * NotaParser — Domain service que transforma texto bruto em seções estruturadas.
 */

const DEFINITION_PATTERN = /^([A-ZÀ-ÚÇ][a-zÀ-úÇ, ]{2,40}):\s(.+)$/;

export class NotaParser {
  /**
   * Parse raw text into structured sections.
   *
   * Markdown-style headings (# Title, ## Subtitle) and ALL CAPS lines are
   * treated as section delimiters.
   */
  static parse(rawText: string): NotaSection[] {
    const lines = rawText.split("\n");
    const sections: NotaSection[] = [];
    let currentSection: NotaSection | null = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (this.isHeading(line)) {
        if (currentSection) sections.push(currentSection);
        currentSection = NotaSection.create(this.extractHeading(line), []);
        continue;
      }

      if (!line) continue;

      if (!currentSection) {
        currentSection = NotaSection.create("Nota", []);
      }

      if (this.isDefinition(line)) {
        const def = this.parseDefinition(line);
        if (def) currentSection.addDefinition(def);
      }

      // Bullet point or regular text
      if (line.startsWith("- ") || line.startsWith("* ")) {
        currentSection.addContentLine(line.slice(2));
      } else {
        currentSection.addContentLine(line);
      }
    }

    if (currentSection) sections.push(currentSection);

    // If no sections were created, treat entire text as one
    if (sections.length === 0) {
      return [
        NotaSection.create("Nota", lines.filter((l) => l.trim().length > 0), []),
      ];
    }

    return sections;
  }

  private static isHeading(line: string): boolean {
    if (line.startsWith("#")) return true;
    // ALL CAPS pseudo-heading
    if (
      line === line.toUpperCase() &&
      line.length > 3 &&
      /^[A-Z0-9À-ÚÇ ]+$/.test(line)
    ) {
      return true;
    }
    return false;
  }

  private static extractHeading(line: string): string {
    return line.replace(/^#+\s*/, "").trim();
  }

  private static isDefinition(line: string): boolean {
    return DEFINITION_PATTERN.test(line);
  }

  private static parseDefinition(line: string): NotaDefinition | null {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 2) return null;

    const term = line.slice(0, colonIdx).trim();
    const explanation = line.slice(colonIdx + 1).trim();
    if (!term || !explanation) return null;

    return NotaDefinition.create(term, explanation);
  }
}
