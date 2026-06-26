// Adiciona os matchers do jest-dom (toBeInTheDocument, toHaveTextContent, …) e
// limpa o DOM entre os testes. Carregado via setupFiles no projeto "dom".
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
