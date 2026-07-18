import { describe, expect, it } from "vitest";
import { planHubConnections, sharedRelationsWithHub, type HubMember } from "./hub-connection";

const HUB: HubMember = { id: "hub", type: "TOPICO" };

const conceito = (id: string): HubMember => ({ id, type: "CONCEITO" });

describe("sharedRelationsWithHub", () => {
  it("lists the relations every member can have with the hub", () => {
    const relations = sharedRelationsWithHub(HUB, [conceito("c1"), conceito("c2")]);

    expect(relations).toContain("PERTENCE_A");
  });

  // Uma relação que só serve para parte da seleção criaria arestas pela metade
  // sem o usuário entender por quê — melhor não oferecer.
  it("keeps only relations valid for ALL members, not for some", () => {
    const mixed = sharedRelationsWithHub(HUB, [conceito("c1"), { id: "b1", type: "BARALHO" }]);

    expect(mixed).toEqual([]);
  });

  it("returns nothing when there is no member to connect", () => {
    expect(sharedRelationsWithHub(HUB, [])).toEqual([]);
  });
});

describe("planHubConnections", () => {
  it("plans one edge per member, pointing in the canonical direction", () => {
    const plan = planHubConnections(HUB, [conceito("c1"), conceito("c2")], "PERTENCE_A");

    expect(plan.edges).toHaveLength(2);
    // CONCEITO→TOPICO é a direção canônica de PERTENCE_A: o conceito é a origem.
    expect(plan.edges[0]).toEqual({
      sourceNodeId: "c1",
      targetNodeId: "hub",
      tipoRelacao: "PERTENCE_A",
    });
  });

  it("never connects the hub to itself", () => {
    const plan = planHubConnections(HUB, [conceito("c1"), HUB], "PERTENCE_A");

    expect(plan.edges.map((e) => e.sourceNodeId)).toEqual(["c1"]);
  });

  it("skips members whose type cannot hold the relation, and says how many", () => {
    const plan = planHubConnections(
      HUB,
      [conceito("c1"), { id: "b1", type: "BARALHO" }],
      "PERTENCE_A",
    );

    expect(plan.edges).toHaveLength(1);
    expect(plan.skipped).toBe(1);
  });

  it("plans nothing for a relation that does not apply to the hub at all", () => {
    const plan = planHubConnections(HUB, [conceito("c1")], "CONTEM");

    expect(plan.edges).toEqual([]);
    expect(plan.skipped).toBe(1);
  });
});
