/** Preserves each sibling dialog's identity even when they refer to the same node.
 * @example graphNodeDialogKey("edit-node", selectedNode.id)
 */
export function graphNodeDialogKey(dialog: "edit-node" | "link-exam", nodeId?: string | null): string {
  const identity = nodeId == null ? "closed" : `node:${nodeId}`;
  return `${dialog}:${identity}`;
}
