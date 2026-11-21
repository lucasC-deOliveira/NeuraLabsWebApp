import { describe, expect, it } from "vitest";
import { graphNodeDialogKey } from "./graph-node-dialog-key";

describe("graph node dialog keys", () => {
  it("keeps edit and exam-link dialogs distinct for the same selected node", () => {
    const editing = graphNodeDialogKey("edit-node", "same-node");
    const linking = graphNodeDialogKey("link-exam", "same-node");
    expect(editing).not.toBe(linking);
  });

  it("keeps a dialog stable while typing and resets it for a different node", () => {
    const editing = graphNodeDialogKey("edit-node", "first");
    expect(graphNodeDialogKey("edit-node", "first")).toBe(editing);
    expect(graphNodeDialogKey("edit-node", "second")).not.toBe(editing);
    expect(graphNodeDialogKey("edit-node", null)).not.toBe(editing);
  });
});
