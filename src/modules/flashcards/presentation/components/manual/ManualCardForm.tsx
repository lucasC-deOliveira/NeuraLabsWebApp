"use client";

import { useFieldArray, useFormState } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { XIcon, PlusIcon } from "lucide-react";
import { FormField } from "@/components/ui/form";
import type { ManualCardType } from "../../../domain/manual-card";
import {
  ManualInputField, ManualTextAreaField, MANUAL_INPUT_CLS, type ManualControl,
} from "./form-fields";

interface FieldsProps {
  control: ManualControl;
}

function DefinicaoFields({ control }: FieldsProps) {
  return (
    <>
      <ManualInputField control={control} name="pergunta" label="Termo / Conceito" placeholder="Ex: Princípio da legalidade" />
      <ManualTextAreaField control={control} name="resposta" label="Definição" placeholder="Ex: Princípio segundo o qual..." minH={100} />
    </>
  );
}

function ExplicacaoFields({ control }: FieldsProps) {
  return (
    <>
      <ManualTextAreaField control={control} name="pergunta" label="Pergunta / Tópico" placeholder="Ex: Como funciona a fotossíntese?" minH={80} />
      <ManualTextAreaField control={control} name="resposta" label="Explicação" placeholder="1. A luz solar é absorvida..." minH={140} />
    </>
  );
}

function ExemploFields({ control }: FieldsProps) {
  return (
    <>
      <ManualInputField control={control} name="pergunta" label="Conceito a exemplificar" placeholder="Ex: Metáfora" />
      <ManualTextAreaField control={control} name="resposta" label="Exemplo concreto" placeholder="Ex: 'A vida é uma viagem sem mapa'" minH={100} />
    </>
  );
}

function RelacionalFields({ control }: FieldsProps) {
  return (
    <>
      <ManualTextAreaField control={control} name="pergunta" label="Termos a relacionar" placeholder="Ex: Relacione: DNA / RNA / Proteína" minH={80} />
      <ManualTextAreaField control={control} name="resposta" label="Relações / Correspondências" placeholder="Ex: DNA → transcrito em RNA → traduzido em Proteína" minH={100} />
    </>
  );
}

function AplicacaoFields({ control }: FieldsProps) {
  return (
    <>
      <ManualTextAreaField control={control} name="cenario" label="Cenário / Problema" placeholder="Ex: Um paciente com deficiência de vitamina B12..." minH={80} />
      <ManualTextAreaField control={control} name="explicacaoApp" label="Como aplicar / Solução" placeholder="A deficiência de B12 compromete..." minH={100} />
    </>
  );
}

function ContrasteFields({ control }: FieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ManualInputField control={control} name="conceitoA" label="Conceito A" placeholder="Ex: Célula procarionte" />
        <ManualInputField control={control} name="conceitoB" label="Conceito B" placeholder="Ex: Célula eucarionte" />
      </div>
      <ManualTextAreaField control={control} name="explicacaoComp" label="Diferenças / Comparativo" placeholder="- Procarionte: sem núcleo..." minH={100} />
    </>
  );
}

function CompletarFields({ control }: FieldsProps) {
  return (
    <>
      <ManualInputField control={control} name="frase" label="Frase com lacuna (use {{...}})" placeholder="Ex: A mitocôndria produz {{...}}." />
      <ManualInputField control={control} name="lacuna" label="Resposta da lacuna" placeholder="Ex: ATP" />
    </>
  );
}

const MAX_ORDERING_STEPS = 8;

// O `fields` do useFieldArray é um snapshot — só muda em append/remove. Por isso o
// input e o botão de limpar vivem dentro do render do FormField, onde `field.value`
// é o valor corrente do formulário.
function OrderingStep({ control, index }: FieldsProps & { index: number }) {
  return (
    <FormField
      control={control}
      name={`itens.${index}.value`}
      render={({ field }) => (
        <>
          <input {...field} placeholder={`Passo ${index + 1}`} className={`flex-1 ${MANUAL_INPUT_CLS}`} />
          {field.value && (
            <XIcon
              className="size-3.5 text-zinc-300 cursor-pointer flex-shrink-0"
              onClick={() => field.onChange("")}
            />
          )}
        </>
      )}
    />
  );
}

// "Nenhum item preenchido" é um erro do array inteiro, não de um passo. Como os
// passos são registrados individualmente, o RHF move esse erro para `itens.root`
// (updateFieldArrayRootError) — daí a leitura explícita em vez de um FormMessage.
function OrderingRootMessage({ control }: FieldsProps) {
  const { errors } = useFormState({ control, name: "itens" });
  const message = errors.itens?.root?.message;
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function OrdenacaoFields({ control }: FieldsProps) {
  const { fields, append } = useFieldArray({ control, name: "itens" });
  return (
    <>
      <ManualInputField control={control} name="temaLista" label="O que ordenar" placeholder="Ex: Etapas da mitose" />
      <div className="space-y-2">
        <Label>Itens na ordem correta</Label>
        {fields.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 w-6 text-right">{i + 1}.</span>
            <OrderingStep control={control} index={i} />
          </div>
        ))}
        {fields.length < MAX_ORDERING_STEPS && (
          <button type="button" onClick={() => append({ value: "" })} className="text-xs text-primary hover:underline flex items-center gap-1">
            <PlusIcon className="size-3" />Adicionar passo
          </button>
        )}
        <OrderingRootMessage control={control} />
      </div>
    </>
  );
}

function ErroComumFields({ control }: FieldsProps) {
  return (
    <>
      <ManualInputField control={control} name="temaErro" label="Tema" placeholder="Ex: Fotossíntese" />
      <ManualTextAreaField control={control} name="erro" label="Erro comum" placeholder="Muitos acham que a fotossíntese ocorre à noite..." minH={70} accent="red" />
      <ManualTextAreaField control={control} name="correto" label="Explicação correta" placeholder="Na verdade, a fotossíntese depende de luz solar..." minH={70} accent="emerald" />
    </>
  );
}

const FIELD_GROUPS: Record<ManualCardType, (p: FieldsProps) => React.ReactNode> = {
  DEFINICAO: DefinicaoFields,
  EXPLICACAO: ExplicacaoFields,
  EXEMPLO: ExemploFields,
  RELACIONAL: RelacionalFields,
  APLICACAO: AplicacaoFields,
  CONTRASTE: ContrasteFields,
  COMPLETAR: CompletarFields,
  ORDENACAO: OrdenacaoFields,
  ERRO_COMUM: ErroComumFields,
};

export function ManualCardForm({ tipo, control }: { tipo: ManualCardType } & FieldsProps) {
  const Group = FIELD_GROUPS[tipo];
  return <Group control={control} />;
}
