import { describe, it, expect } from "vitest";
import { Subject } from "./subject.entity";
import { Topic } from "./topic.entity";
import { Concept } from "./concept.entity";

describe("Subject entity", () => {
  const props = { id: "s1", name: "Direito", description: "Ciências jurídicas", userId: "u1" };

  it("exposes all props via getters", () => {
    const s = Subject.create(props);
    expect(s.id).toBe("s1");
    expect(s.name).toBe("Direito");
    expect(s.description).toBe("Ciências jurídicas");
    expect(s.userId).toBe("u1");
  });

  it("toDTO returns only public fields", () => {
    const dto = Subject.create(props).toDTO();
    expect(dto).toEqual({ id: "s1", name: "Direito", description: "Ciências jurídicas" });
    expect("userId" in dto).toBe(false);
  });

  it("accepts null description", () => {
    const s = Subject.create({ ...props, description: null });
    expect(s.description).toBeNull();
    expect(s.toDTO().description).toBeNull();
  });
});

describe("Topic entity", () => {
  const props = { id: "t1", name: "Contratos", description: null, userId: "u1" };

  it("exposes all props via getters", () => {
    const t = Topic.create(props);
    expect(t.id).toBe("t1");
    expect(t.name).toBe("Contratos");
    expect(t.description).toBeNull();
    expect(t.userId).toBe("u1");
  });

  it("toDTO returns only public fields", () => {
    const dto = Topic.create(props).toDTO();
    expect(dto).toEqual({ id: "t1", name: "Contratos", description: null });
  });
});

describe("Concept entity", () => {
  const props = { id: "c1", name: "Oferta", description: "Proposta negocial", userId: "u1" };

  it("exposes all props with defaults", () => {
    const c = Concept.create(props);
    expect(c.id).toBe("c1");
    expect(c.flashcardCount).toBe(0);
  });

  it("toDTO includes flashcardCount", () => {
    const dto = Concept.create({ ...props, flashcardCount: 5 }).toDTO();
    expect(dto.flashcardCount).toBe(5);
  });

  it("flashcardCount defaults to 0 when undefined", () => {
    const dto = Concept.create(props).toDTO();
    expect(dto.flashcardCount).toBe(0);
  });
});
