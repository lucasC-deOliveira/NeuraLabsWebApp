import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2Icon, PlusIcon } from "lucide-react";
import type { AvailableItem } from "@/modules/graph/application/ports/graph-data.port";
import type { ParsedQuestao } from "@/modules/graph/application/ports/graph-prova.port";
import type { CreateNodeFormValues } from "@/modules/graph/domain/services/create-node-form";
import { RelationLinkList, type LinkRow } from "./RelationLinkList";
import { ProvaForm, type ProvaSubMode, type ProvaUploadStep } from "./ProvaForm";
import { DeckForm, type DeckFlashcard } from "./DeckForm";
import { NotaFields, NotaAiSuggestions, type NotaSuggestion } from "./NotaForm";
import { ExistingItemsPicker } from "./ExistingItemsPicker";
import { NodeTypeSelect, NameDescriptionFields, FlashcardFields } from "./NodeFields";

export interface NamedRef {
  id: string;
  nome: string;
}
export interface CreateNodeParents {
  assuntos: NamedRef[];
  topicos: NamedRef[];
  conceitos: NamedRef[];
  textosBrutos: NamedRef[];
  flashcards: NamedRef[];
}

export type CreateTab = "create" | "existing";

interface LinkEditor {
  rows: LinkRow[];
  onChange: (rows: LinkRow[]) => void;
  options: NamedRef[];
  relations: readonly string[];
}

export interface CreateNodeVm {
  open: boolean;
  close: (open: boolean) => void;
  loading: boolean;
  submit: () => void;
  activeTab: CreateTab;
  setActiveTab: (tab: CreateTab) => void;
  selectedType: string;
  changeType: (type: string) => void;
  form: CreateNodeFormValues;
  setForm: (patch: Partial<CreateNodeFormValues>) => void;
  availableItems: { flashcards: AvailableItem[]; notas: AvailableItem[]; provas: AvailableItem[] };
  filteredFlashcards: AvailableItem[];
  selectedItems: Set<string>;
  toggleItem: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  aiSuggestions: NotaSuggestion[];
  setAiSuggestions: (suggestions: NotaSuggestion[]) => void;
  aiLoading: boolean;
  suggest: () => void;
  deckFlashcards: DeckFlashcard[];
  deckLoading: boolean;
  deckSelected: Set<string>;
  toggleDeck: (id: string) => void;
  deckSearch: string;
  setDeckSearch: (search: string) => void;
  topicoAssuntos: LinkEditor;
  conceitoTopicos: LinkEditor;
  flashcardConceitos: LinkEditor;
  notaConceitos: LinkEditor;
  notaTextoBrutoId: string;
  setNotaTextoBrutoId: (id: string) => void;
  prova: {
    provas: AvailableItem[];
    subMode: ProvaSubMode;
    setSubMode: (mode: ProvaSubMode) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedProvaId: string;
    setSelectedProvaId: (id: string) => void;
    uploadStep: ProvaUploadStep;
    provaFile: File | null;
    setProvaFile: (file: File | null) => void;
    gabaritoFile: File | null;
    setGabaritoFile: (file: File | null) => void;
    parsedTitulo: string;
    setParsedTitulo: (title: string) => void;
    parsedQuestoes: ParsedQuestao[];
    setParsedQuestaoGabarito: (index: number, value: string) => void;
  };
}

function submitLabel(vm: CreateNodeVm): string {
  if (vm.selectedType === "PROVA") {
    if (vm.prova.subMode === "existing") return "Vincular prova ao grafo";
    return vm.prova.uploadStep === "review" ? "Criar prova e adicionar ao grafo" : "Processar arquivos";
  }
  if (vm.activeTab === "create") return "Criar nó";
  return vm.selectedItems.size > 0 ? `Adicionar ${vm.selectedItems.size} item(s)` : "Selecione itens";
}

const TAB_BASE = "flex-1 py-2 px-4 text-sm font-medium transition-colors";
const TAB_ACTIVE = "border-b-2 border-primary text-primary";
const TAB_IDLE = "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100";

export function CreateNodeDialog({ vm, parents }: { vm: CreateNodeVm; parents: CreateNodeParents }) {
  return (
    <Dialog open={vm.open} onOpenChange={vm.close}>
      <DialogContent className="max-w-2xl flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>Adicionar nós ao grafo</DialogTitle>
          <DialogDescription>Crie novos nós ou adicione flashcards e notas existentes ao grafo.</DialogDescription>
        </DialogHeader>

        <div className="shrink-0 mt-4 flex border-b border-zinc-200 dark:border-zinc-800">
          <button onClick={() => vm.setActiveTab("create")} className={`${TAB_BASE} ${vm.activeTab === "create" ? TAB_ACTIVE : TAB_IDLE}`}>
            Criar novo
          </button>
          {(vm.selectedType === "FLASHCARD" || vm.selectedType === "NOTA") && (
            <button onClick={() => vm.setActiveTab("existing")} className={`${TAB_BASE} ${vm.activeTab === "existing" ? TAB_ACTIVE : TAB_IDLE}`}>
              Adicionar existentes
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-4 px-1 -mx-1">
          {vm.activeTab === "existing" && <ExistingTabBody vm={vm} parents={parents} />}
          {vm.activeTab === "create" && <CreateTabBody vm={vm} parents={parents} />}
        </div>

        <DialogFooter className="shrink-0 mt-4">
          <Button variant="outline" onClick={() => vm.close(false)}>
            Cancelar
          </Button>
          <Button onClick={vm.submit} disabled={vm.loading}>
            {vm.loading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <>
                <PlusIcon className="size-4" />
                {submitLabel(vm)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkEditorView({ editor, title, emptyMessage, addLabel }: { editor: LinkEditor; title: string; emptyMessage: string; addLabel: string }) {
  return (
    <RelationLinkList
      links={editor.rows}
      onChange={editor.onChange}
      options={editor.options}
      relations={editor.relations}
      title={title}
      emptyMessage={emptyMessage}
      addLabel={addLabel}
    />
  );
}

function NotaTextoBrutoSelect({ value, onChange, textosBrutos }: { value: string; onChange: (id: string) => void; textosBrutos: NamedRef[] }) {
  return (
    <div className="space-y-1.5">
      <Label>Texto bruto de origem (opcional)</Label>
      {textosBrutos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum texto bruto no grafo para relacionar.</p>
      ) : (
        <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v ?? "")}>
          <SelectTrigger className="flex-1 min-w-0">
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhum</SelectItem>
            {textosBrutos.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="text-xs text-muted-foreground">O texto bruto gera esta nota. Uma nota tem no máximo um texto de origem.</p>
    </div>
  );
}

function NotaLinkEditors({ vm, parents }: { vm: CreateNodeVm; parents: CreateNodeParents }) {
  return (
    <>
      <NotaTextoBrutoSelect value={vm.notaTextoBrutoId} onChange={vm.setNotaTextoBrutoId} textosBrutos={parents.textosBrutos} />
      <LinkEditorView editor={vm.notaConceitos} title="Conceitos relacionados (opcional)" emptyMessage="Nenhum conceito no grafo para relacionar." addLabel="Adicionar conceito" />
    </>
  );
}

function ExistingTabBody({ vm, parents }: { vm: CreateNodeVm; parents: CreateNodeParents }) {
  return (
    <>
      <ExistingItemsPicker
        type={vm.selectedType as "FLASHCARD" | "NOTA"}
        searchQuery={vm.searchQuery}
        onSearch={vm.setSearchQuery}
        flashcards={vm.availableItems.flashcards}
        filteredFlashcards={vm.filteredFlashcards}
        notas={vm.availableItems.notas}
        selectedItems={vm.selectedItems}
        onToggle={vm.toggleItem}
      />
      {vm.selectedType === "FLASHCARD" && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <LinkEditorView editor={vm.flashcardConceitos} title="Conceitos relacionados (opcional)" emptyMessage="Nenhum conceito no grafo para relacionar." addLabel="Adicionar conceito" />
          <p className="mt-1 text-xs text-muted-foreground">As relações escolhidas serão criadas para cada flashcard selecionado.</p>
        </div>
      )}
      {vm.selectedType === "NOTA" && (
        <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <NotaLinkEditors vm={vm} parents={parents} />
          <p className="text-xs text-muted-foreground">As relações escolhidas serão criadas para cada nota selecionada.</p>
        </div>
      )}
    </>
  );
}

function CreateTabBody({ vm, parents }: { vm: CreateNodeVm; parents: CreateNodeParents }) {
  return (
    <>
      <NodeTypeSelect value={vm.selectedType} onChange={vm.changeType} />
      {vm.selectedType === "BARALHO" && (
        <DeckForm
          titulo={vm.form.nome}
          onTitulo={(value) => vm.setForm({ nome: value })}
          flashcards={vm.deckFlashcards}
          loading={vm.deckLoading}
          selected={vm.deckSelected}
          onToggle={vm.toggleDeck}
          search={vm.deckSearch}
          onSearch={vm.setDeckSearch}
        />
      )}
      {vm.selectedType === "PROVA" && (
        <ProvaForm
          provas={vm.prova.provas}
          subMode={vm.prova.subMode}
          onSubModeChange={vm.prova.setSubMode}
          searchQuery={vm.prova.searchQuery}
          onSearchChange={vm.prova.setSearchQuery}
          selectedProvaId={vm.prova.selectedProvaId}
          onSelectProva={vm.prova.setSelectedProvaId}
          uploadStep={vm.prova.uploadStep}
          provaFile={vm.prova.provaFile}
          onProvaFile={vm.prova.setProvaFile}
          gabaritoFile={vm.prova.gabaritoFile}
          onGabaritoFile={vm.prova.setGabaritoFile}
          parsedTitulo={vm.prova.parsedTitulo}
          onParsedTitulo={vm.prova.setParsedTitulo}
          parsedQuestoes={vm.prova.parsedQuestoes}
          onSetGabarito={vm.prova.setParsedQuestaoGabarito}
        />
      )}
      {vm.selectedType === "ASSUNTO" && (
        <div className="space-y-3">
          <NameDescriptionFields idPrefix="assunto" nome={vm.form.nome} descricao={vm.form.descricao} onNome={(v) => vm.setForm({ nome: v })} onDescricao={(v) => vm.setForm({ descricao: v })} nomePlaceholder="Ex: Direito Constitucional" descricaoPlaceholder="Breve descrição do assunto" />
        </div>
      )}
      {vm.selectedType === "TOPICO" && (
        <div className="space-y-3">
          <NameDescriptionFields idPrefix="topico" nome={vm.form.nome} descricao={vm.form.descricao} onNome={(v) => vm.setForm({ nome: v })} onDescricao={(v) => vm.setForm({ descricao: v })} nomePlaceholder="Ex: Princípios Fundamentais" descricaoPlaceholder="Breve descrição do tópico" />
          <LinkEditorView editor={vm.topicoAssuntos} title="Assuntos relacionados (opcional)" emptyMessage="Nenhum assunto no grafo para relacionar." addLabel="Adicionar assunto" />
        </div>
      )}
      {vm.selectedType === "CONCEITO" && (
        <div className="space-y-3">
          <NameDescriptionFields idPrefix="conceito" nome={vm.form.nome} descricao={vm.form.descricao} onNome={(v) => vm.setForm({ nome: v })} onDescricao={(v) => vm.setForm({ descricao: v })} nomePlaceholder="Ex: Habeas Corpus" descricaoPlaceholder="Breve descrição do conceito" />
          <LinkEditorView editor={vm.conceitoTopicos} title="Tópicos relacionados (opcional)" emptyMessage="Nenhum tópico no grafo para relacionar." addLabel="Adicionar tópico" />
        </div>
      )}
      {vm.selectedType === "FLASHCARD" && (
        <div className="space-y-3">
          <FlashcardFields pergunta={vm.form.pergunta} resposta={vm.form.resposta} onPergunta={(v) => vm.setForm({ pergunta: v })} onResposta={(v) => vm.setForm({ resposta: v })} />
          <LinkEditorView editor={vm.flashcardConceitos} title="Conceitos relacionados (opcional)" emptyMessage="Nenhum conceito no grafo para relacionar." addLabel="Adicionar conceito" />
        </div>
      )}
      {vm.selectedType === "NOTA" && (
        <div className="space-y-3">
          <NotaFields form={vm.form} onField={(key, value) => vm.setForm({ [key]: value })} />
          <NotaLinkEditors vm={vm} parents={parents} />
          <NotaAiSuggestions loading={vm.aiLoading} suggestions={vm.aiSuggestions} onSuggest={vm.suggest} onChange={vm.setAiSuggestions} />
        </div>
      )}
    </>
  );
}
