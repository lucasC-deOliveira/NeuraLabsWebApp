import { describe, it, expect } from "vitest";
import { resolveCrumbs, shouldShowBack } from "./header-crumbs";

const names = (pathname: string): string[] => resolveCrumbs(pathname).map((c) => c.name);

describe("resolveCrumbs", () => {
  it("has no trail on the dashboard, which is the root itself", () => {
    expect(resolveCrumbs("/")).toEqual([]);
  });

  it("shows only Home at the root of a section", () => {
    expect(names("/flashcards")).toEqual(["Home"]);
    expect(names("/baralhos")).toEqual(["Home"]);
    expect(names("/settings")).toEqual(["Home"]);
  });

  it("shows Home and the section inside a detail page", () => {
    expect(names("/baralhos/abc123")).toEqual(["Home", "Baralhos"]);
    expect(names("/notes/xyz")).toEqual(["Home", "Notas"]);
    expect(names("/provas/1")).toEqual(["Home", "Provas"]);
  });

  it("shows Home and the section on a creation page", () => {
    expect(names("/flashcards/new")).toEqual(["Home", "Flashcards"]);
    expect(names("/questions/new")).toEqual(["Home", "Questões"]);
  });

  it("links each crumb to its section root", () => {
    expect(resolveCrumbs("/baralhos/abc")).toEqual([
      { name: "Home", href: "/", icon: "home" },
      { name: "Baralhos", href: "/baralhos", icon: "baralhos" },
    ]);
  });

  it("takes the VR view back to the graph, which it renders", () => {
    expect(names("/vr/g1")).toEqual(["Home", "Grafo"]);
  });

  it("does not confuse a section with another starting the same way", () => {
    expect(names("/graphics")).toEqual(["Home"]);
  });

  it("falls back to Home on an unknown route", () => {
    expect(names("/nao-existe")).toEqual(["Home"]);
  });
});

describe("shouldShowBack", () => {
  it("offers back inside a section", () => {
    expect(shouldShowBack("/baralhos/abc")).toBe(true);
    expect(shouldShowBack("/flashcards/new")).toBe(true);
    expect(shouldShowBack("/vr/g1")).toBe(true);
  });

  it("does not offer back at the root of a section, the sidebar already goes home", () => {
    expect(shouldShowBack("/flashcards")).toBe(false);
    expect(shouldShowBack("/graph")).toBe(false);
  });

  it("does not offer back on the dashboard", () => {
    expect(shouldShowBack("/")).toBe(false);
  });
});
