// Carrega as fontes e o CSS global (Tailwind v4) DENTRO do browser, para os
// screenshots saírem com o estilo real do app. Limpa o DOM entre os testes.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@/app/globals.css";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
