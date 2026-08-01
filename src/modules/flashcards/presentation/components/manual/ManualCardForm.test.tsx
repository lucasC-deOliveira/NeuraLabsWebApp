import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import type { ManualCardType } from "../../../domain/manual-card";
import {
  MANUAL_CARD_SCHEMAS, EMPTY_MANUAL_FORM_VALUES, type ManualCardFormValues,
} from "../../../domain/services/manual-card-schema";
import { ManualCardForm } from "./ManualCardForm";

function Harness({ tipo, onSubmit }: { tipo: ManualCardType; onSubmit: (v: ManualCardFormValues) => void }) {
  const form = useForm<ManualCardFormValues>({
    resolver: zodResolver(MANUAL_CARD_SCHEMAS[tipo]),
    defaultValues: EMPTY_MANUAL_FORM_VALUES,
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <ManualCardForm tipo={tipo} control={form.control} />
        <button type="submit">Criar</button>
      </form>
    </Form>
  );
}

async function submit(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Criar" }));
}

describe("ManualCardForm", () => {
  it("stays quiet until the user submits", () => {
    render(<Harness tipo="DEFINICAO" onSubmit={vi.fn()} />);
    expect(screen.queryByText("Informe o termo ou conceito")).not.toBeInTheDocument();
  });

  it("reports the missing fields of the selected type on submit", async () => {
    const onSubmit = vi.fn();
    render(<Harness tipo="DEFINICAO" onSubmit={onSubmit} />);

    await submit();

    expect(await screen.findByText("Informe o termo ou conceito")).toBeInTheDocument();
    expect(screen.getByText("Informe a definição")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits once the required fields are filled", async () => {
    const onSubmit = vi.fn();
    render(<Harness tipo="DEFINICAO" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("Termo / Conceito"), "Soberania");
    await userEvent.type(screen.getByLabelText("Definição"), "poder supremo");
    await submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ pergunta: "Soberania", resposta: "poder supremo" });
  });

  it("points CONTRASTE at the concept that is actually missing", async () => {
    render(<Harness tipo="CONTRASTE" onSubmit={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Conceito A"), "Procarionte");
    await userEvent.type(screen.getByLabelText("Diferenças / Comparativo"), "sem núcleo");
    await submit();

    expect(await screen.findByText("Informe o segundo conceito")).toBeInTheDocument();
    expect(screen.queryByText("Informe o primeiro conceito")).not.toBeInTheDocument();
  });

  it("appends ordering steps and carries them into the submitted values", async () => {
    const onSubmit = vi.fn();
    render(<Harness tipo="ORDENACAO" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("O que ordenar"), "Etapas da mitose");
    await userEvent.click(screen.getByRole("button", { name: /Adicionar passo/ }));
    const steps = screen.getAllByPlaceholderText(/^Passo /);
    expect(steps).toHaveLength(4);

    await userEvent.type(steps[0], "prófase");
    await submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].itens).toEqual([
      { value: "prófase" }, { value: "" }, { value: "" }, { value: "" },
    ]);
  });

  it("blocks ORDENACAO while every step is blank", async () => {
    const onSubmit = vi.fn();
    render(<Harness tipo="ORDENACAO" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("O que ordenar"), "Etapas da mitose");
    await submit();

    expect(await screen.findByText("Informe ao menos um item da ordem")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears a filled step through its remove icon", async () => {
    render(<Harness tipo="ORDENACAO" onSubmit={vi.fn()} />);
    const step = screen.getAllByPlaceholderText(/^Passo /)[0];

    await userEvent.type(step, "prófase");
    await userEvent.click(document.querySelector(".lucide-x") as Element);

    expect(step).toHaveValue("");
  });
});
