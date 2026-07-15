import { describe, it, expect } from "vitest";
import { SETTINGS_SECTIONS, visibleSections, findSection } from "./settings-sections";

describe("visibleSections", () => {
  it("shows every section on the desktop app", () => {
    expect(visibleSections(true)).toHaveLength(SETTINGS_SECTIONS.length);
  });

  it("hides the desktop-only sections in the browser", () => {
    expect(visibleSections(false).map((s) => s.id)).toEqual(["aparencia", "flashcards", "ia"]);
  });

  it("gives every section a summary, like the Android list", () => {
    for (const section of SETTINGS_SECTIONS) expect(section.resumo).not.toBe("");
  });
});

describe("findSection", () => {
  it("finds a section by its slug", () => {
    expect(findSection("ia", false)?.titulo).toBe("Conexão com IA");
  });

  it("does not find an unknown slug", () => {
    expect(findSection("nao-existe", true)).toBeNull();
  });

  it("does not find a desktop section in the browser", () => {
    expect(findSection("desktop", true)?.id).toBe("desktop");
    expect(findSection("desktop", false)).toBeNull();
  });
});
