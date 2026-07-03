import { describe, it, expect } from "vitest";
import { syncNotaConceitoRels } from "./manual-nota-draft";

describe("syncNotaConceitoRels", () => {
  it("keeps still-selected relations and adds DEFINE for new ids", () => {
    const prev = [{ conceitoId: "a", tipoRelacao: "EXPLICA" }];
    const result = syncNotaConceitoRels(prev, ["a", "b"]);
    expect(result).toEqual([
      { conceitoId: "a", tipoRelacao: "EXPLICA" },
      { conceitoId: "b", tipoRelacao: "DEFINE" },
    ]);
  });

  it("drops relations for deselected concepts", () => {
    const prev = [{ conceitoId: "a", tipoRelacao: "EXPLICA" }, { conceitoId: "b", tipoRelacao: "DEFINE" }];
    expect(syncNotaConceitoRels(prev, ["b"])).toEqual([{ conceitoId: "b", tipoRelacao: "DEFINE" }]);
  });
});
