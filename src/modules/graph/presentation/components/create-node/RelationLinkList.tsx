import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { XIcon, PlusIcon } from "lucide-react";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";

// Editor genérico de "links relacionados" (alvo + relação + peso), reutilizado
// pelos formulários de criação (tópico→assuntos, conceito→tópicos, flashcard/nota→
// conceitos). Um alvo já escolhido não reaparece nas demais linhas.

export interface LinkRow {
  targetId: string;
  relacao: string;
  peso: number;
}

export interface RelationOption {
  id: string;
  nome: string;
}

interface RelationLinkListProps {
  links: LinkRow[];
  options: RelationOption[];
  relations: readonly string[];
  onChange: (links: LinkRow[]) => void;
  title: string;
  emptyMessage: string;
  addLabel: string;
}

export function RelationLinkList(props: RelationLinkListProps) {
  const { links, options, relations, onChange } = props;
  const update = (idx: number, patch: Partial<LinkRow>): void =>
    onChange(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const remove = (idx: number): void => onChange(links.filter((_, i) => i !== idx));
  const add = (): void => onChange([...links, { targetId: "", relacao: relations[0], peso: 1 }]);

  return (
    <div className="space-y-2">
      <Label>{props.title}</Label>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">{props.emptyMessage}</p>
      ) : (
        <>
          {links.map((link, idx) => (
            <RelationLinkRow
              key={idx}
              link={link}
              idx={idx}
              links={links}
              options={options}
              relations={relations}
              onUpdate={update}
              onRemove={remove}
            />
          ))}
          {links.length < options.length && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={add}>
              <PlusIcon className="size-3.5" />
              {props.addLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

interface RelationLinkRowProps {
  link: LinkRow;
  idx: number;
  links: LinkRow[];
  options: RelationOption[];
  relations: readonly string[];
  onUpdate: (idx: number, patch: Partial<LinkRow>) => void;
  onRemove: (idx: number) => void;
}

function availableOptions(props: RelationLinkRowProps): RelationOption[] {
  const usados = new Set(
    props.links.filter((_, i) => i !== props.idx).map((l) => l.targetId).filter(Boolean),
  );
  return props.options.filter((c) => c.id === props.link.targetId || !usados.has(c.id));
}

function RelationLinkRow(props: RelationLinkRowProps) {
  const { link, idx, relations, onUpdate, onRemove } = props;
  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={link.targetId || "__none__"}
        onValueChange={(value) => onUpdate(idx, { targetId: value === "__none__" ? "" : value ?? "" })}
      >
        <SelectTrigger className="flex-1 min-w-0">
          <SelectValue placeholder="Alvo" />
        </SelectTrigger>
        <SelectContent>
          {availableOptions(props).map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={link.relacao} onValueChange={(value) => onUpdate(idx, { relacao: value ?? link.relacao })}>
        <SelectTrigger className="w-32 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {relations.map((r) => (
            <SelectItem key={r} value={r}>
              {RELATION_LABELS[r] ?? r.toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={0.1}
        max={2}
        step={0.1}
        value={link.peso}
        title="Peso da relação (0.1 a 2)"
        onChange={(e) => onUpdate(idx, { peso: Number(e.target.value) })}
        className="w-16 shrink-0"
      />
      <button
        type="button"
        onClick={() => onRemove(idx)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
        title="Remover"
        aria-label="Remover relação"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
