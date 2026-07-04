"use client";

import { Label } from "@/components/ui/label";
import { XIcon, PlusIcon } from "lucide-react";
import type { ManualCardType, ManualCardFields, ManualFormErrors } from "../../../domain/manual-card";
import { FormInput, FormTextArea } from "./form-fields";

type Patch = (p: Partial<ManualCardFields>) => void;

interface FieldsProps {
  fields: ManualCardFields;
  errors: ManualFormErrors;
  patch: Patch;
}

function DefinicaoFields({ fields, errors, patch }: FieldsProps) {
  return (
    <>
      <FormInput label="Termo / Conceito" value={fields.pergunta} error={errors.query} placeholder="Ex: Princípio da legalidade" onChange={(v) => patch({ pergunta: v })} />
      <FormTextArea label="Definição" value={fields.resposta} onChange={(v) => patch({ resposta: v })} placeholder="Ex: Princípio segundo o qual..." error={errors.response} minH={100} />
    </>
  );
}

function ExplicacaoFields({ fields, errors, patch }: FieldsProps) {
  return (
    <>
      <FormTextArea label="Pergunta / Tópico" value={fields.pergunta} onChange={(v) => patch({ pergunta: v })} placeholder="Ex: Como funciona a fotossíntese?" error={errors.query} minH={80} />
      <FormTextArea label="Explicação" value={fields.resposta} onChange={(v) => patch({ resposta: v })} placeholder="1. A luz solar é absorvida..." error={errors.response} minH={140} />
    </>
  );
}

function ExemploFields({ fields, errors, patch }: FieldsProps) {
  return (
    <>
      <FormInput label="Conceito a exemplificar" value={fields.pergunta} error={errors.query} placeholder="Ex: Metáfora" onChange={(v) => patch({ pergunta: v })} />
      <FormTextArea label="Exemplo concreto" value={fields.resposta} onChange={(v) => patch({ resposta: v })} placeholder="Ex: 'A vida é uma viagem sem mapa'" error={errors.response} minH={100} />
    </>
  );
}

function RelacionalFields({ fields, errors, patch }: FieldsProps) {
  return (
    <>
      <FormTextArea label="Termos a relacionar" value={fields.pergunta} onChange={(v) => patch({ pergunta: v })} placeholder="Ex: Relacione: DNA / RNA / Proteína" error={errors.query} minH={80} />
      <FormTextArea label="Relações / Correspondências" value={fields.resposta} onChange={(v) => patch({ resposta: v })} placeholder="Ex: DNA → transcrito em RNA → traduzido em Proteína" error={errors.response} minH={100} />
    </>
  );
}

function AplicacaoFields({ fields, errors, patch }: FieldsProps) {
  return (
    <>
      <FormTextArea label="Cenário / Problema" value={fields.cenario} onChange={(v) => patch({ cenario: v })} placeholder="Ex: Um paciente com deficiência de vitamina B12..." error={errors.query} minH={80} />
      <FormTextArea label="Como aplicar / Solução" value={fields.explicacaoApp} onChange={(v) => patch({ explicacaoApp: v })} placeholder="A deficiência de B12 compromete..." error={errors.response} minH={100} />
    </>
  );
}

function ContrasteFields({ fields, errors, patch }: FieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormInput label="Conceito A" value={fields.conceitoA} error={errors.query} placeholder="Ex: Célula procarionte" onChange={(v) => patch({ conceitoA: v })} />
        <FormInput label="Conceito B" value={fields.conceitoB} error={errors.query} placeholder="Ex: Célula eucarionte" onChange={(v) => patch({ conceitoB: v })} />
      </div>
      <FormTextArea label="Diferenças / Comparativo" value={fields.explicacaoComp} onChange={(v) => patch({ explicacaoComp: v })} placeholder="- Procarionte: sem núcleo..." error={errors.response} minH={100} />
    </>
  );
}

function CompletarFields({ fields, errors, patch }: FieldsProps) {
  return (
    <>
      <FormInput label="Frase com lacuna (use {{...}})" value={fields.frase} error={errors.query} placeholder="Ex: A mitocôndria produz {{...}}." onChange={(v) => patch({ frase: v })} />
      <FormInput label="Resposta da lacuna" value={fields.lacuna} error={errors.response} placeholder="Ex: ATP" onChange={(v) => patch({ lacuna: v })} />
    </>
  );
}

function OrdenacaoFields({ fields, errors, patch }: FieldsProps) {
  const setItem = (i: number, v: string): void => patch({ itens: fields.itens.map((it, idx) => (idx === i ? v : it)) });
  return (
    <>
      <FormInput label="O que ordenar" value={fields.temaLista} error={errors.query} placeholder="Ex: Etapas da mitose" onChange={(v) => patch({ temaLista: v })} />
      <div className="space-y-2">
        <Label>Itens na ordem correta</Label>
        {fields.itens.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-400 w-6 text-right">{i + 1}.</span>
            <input
              value={item}
              onChange={(e) => setItem(i, e.target.value)}
              placeholder={`Passo ${i + 1}`}
              className="flex-1 h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400"
            />
            {item && <XIcon className="size-3.5 text-zinc-300 cursor-pointer flex-shrink-0" onClick={() => setItem(i, "")} />}
          </div>
        ))}
        {fields.itens.length < 8 && (
          <button type="button" onClick={() => patch({ itens: [...fields.itens, ""] })} className="text-xs text-primary hover:underline flex items-center gap-1">
            <PlusIcon className="size-3" />Adicionar passo
          </button>
        )}
      </div>
    </>
  );
}

function ErroComumFields({ fields, errors, patch }: FieldsProps) {
  return (
    <>
      <FormInput label="Tema" value={fields.temaErro} error={errors.query} placeholder="Ex: Fotossíntese" onChange={(v) => patch({ temaErro: v })} />
      <FormTextArea label="Erro comum" value={fields.erro} onChange={(v) => patch({ erro: v })} placeholder="Muitos acham que a fotossíntese ocorre à noite..." error={errors.response} minH={70} accent="red" />
      <FormTextArea label="Explicação correta" value={fields.correto} onChange={(v) => patch({ correto: v })} placeholder="Na verdade, a fotossíntese depende de luz solar..." error={errors.response} minH={70} accent="emerald" />
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

export function ManualCardForm({ tipo, fields, errors, patch }: { tipo: ManualCardType } & FieldsProps) {
  const Group = FIELD_GROUPS[tipo];
  return <Group fields={fields} errors={errors} patch={patch} />;
}
