import { describe, it, expect } from "vitest";
import { page } from "vitest/browser";
import { render } from "@testing-library/react";
import { Button } from "@/components/ui/button";

// Pilot visual regression: prova que o harness (Chromium + Tailwind CSS + fontes +
// screenshot) funciona. Renderiza um componente determinístico e compara o pixel
// com a baseline em test/__screenshots__. Removível quando houver telas reais cobertas.
describe("Button (visual regression)", () => {
  it("matches the baseline screenshot for the default variant", async () => {
    render(<Button>Salvar</Button>);
    await expect
      .element(page.getByRole("button", { name: "Salvar" }))
      .toMatchScreenshot("button-default");
  });
});
