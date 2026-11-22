import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EditNodeModal } from "./EditNodeModal";

it("keeps the node editor within its dialog even with an unbroken title", async () => {
  const name = "LongContentWithoutSpaces".repeat(35);
  render(<EditNodeModal open onOpenChange={() => undefined} grafoId="graph"
    node={{ id: "node", group: "CONCEITO", label: name }}
    initialDetails={{ nome: name, descricao: name }} />);
  const dialog = await screen.findByRole("dialog");
  const description = await screen.findByLabelText(/Descrição/u);
  expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
  expect(description.getBoundingClientRect().right).toBeLessThanOrEqual(dialog.getBoundingClientRect().right);
});
