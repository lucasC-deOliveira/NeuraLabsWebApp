"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { PlusIcon, Loader2Icon, SparklesIcon, XIcon, SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NotaRelationSuggestion } from "@/modules/graph/application/ports/graph-ai.port";
import type { ParsedQuestao } from "@/modules/graph/application/ports/graph-prova.port";
import { getAllowedRelations } from "@/modules/graph/domain/services/relation-rules";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { validateCreateNodeForm, type CreateNodeError } from "@/modules/graph/domain/services/create-node-form";
import { createGraphNode, createDeck } from "@/modules/graph/application/use-cases/create-graph-node";
import { addExistingItems } from "@/modules/graph/application/use-cases/add-existing-items";
import { graphHttp } from "@/modules/graph/infra/http";
import { RelationLinkList } from "@/modules/graph/presentation/components/create-node/RelationLinkList";
import { ProvaForm } from "@/modules/graph/presentation/components/create-node/ProvaForm";
import { DeckForm } from "@/modules/graph/presentation/components/create-node/DeckForm";
import { NotaFields, NotaAiSuggestions } from "@/modules/graph/presentation/components/create-node/NotaForm";
import { ExistingItemsPicker } from "@/modules/graph/presentation/components/create-node/ExistingItemsPicker";
import { NodeTypeSelect, NameDescriptionFields, FlashcardFields } from "@/modules/graph/presentation/components/create-node/NodeFields";
import { useRouter } from "@/lib/navigation";

// Mensagens pt-BR específicas por tipo para os códigos de validação da criação.
const CREATE_NAME_MESSAGES: Record<string, string> = {
  ASSUNTO: "Digite um nome para o assunto",
  TOPICO: "Digite um nome para o tópico",
  CONCEITO: "Digite um nome para o conceito",
  NOTA: "Digite um título para a nota",
};

function createNodeErrorMessage(code: CreateNodeError, type: string): string {
  switch (code) {
    case "missing-name":
      return CREATE_NAME_MESSAGES[type] ?? "Digite um nome";
    case "flashcard-missing-question":
      return "Digite a pergunta do flashcard";
    case "flashcard-missing-answer":
      return "Digite a resposta para o flashcard";
    case "nota-missing-subtype":
      return "Selecione o subtipo da nota";
    case "nota-missing-source":
      return "Notas de referência exigem a fonte (livro, artigo, vídeo...)";
    case "nota-missing-content":
      return "Digite o texto da nota";
  }
}


// relações possíveis entre um Tópico (origem) e um Assunto (destino)
const TOPICO_ASSUNTO_RELATIONS = getAllowedRelations("TOPICO", "ASSUNTO");
// relações possíveis entre um Conceito (origem) e um Tópico (destino)
const CONCEITO_TOPICO_RELATIONS = getAllowedRelations("CONCEITO", "TOPICO");
// relações possíveis entre um Flashcard (origem) e um Conceito (destino).
// Na criação manual o flashcard não vem de uma nota, então não usa HERDA
// (reservado à herança automática) — relaciona-se como uma nota faria.
const FLASHCARD_CONCEITO_RELATIONS = getAllowedRelations("FLASHCARD", "CONCEITO").filter(
  (r) => r !== "HERDA"
);
// relações possíveis entre uma Nota (origem) e um Conceito (destino)
const NOTA_CONCEITO_RELATIONS = getAllowedRelations("NOTA", "CONCEITO");

type TopicoAssuntoLink = { assuntoId: string; relacao: string; peso: number };
type ConceitoTopicoLink = { topicoId: string; relacao: string; peso: number };
type FlashcardConceitoLink = { conceitoId: string; relacao: string; peso: number };
type NotaConceitoLink = { conceitoId: string; relacao: string; peso: number };

interface CreateNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  parentIds?: {
    assuntos: { id: string; nome: string }[];
    topicos: { id: string; nome: string }[];
    conceitos: { id: string; nome: string }[];
    textosBrutos: { id: string; nome: string }[];
    flashcards: { id: string; nome: string }[];
  };
  onSuccess?: () => void;
}

export function CreateNodeModal({
  open,
  onOpenChange,
  grafoId,
  parentIds = { assuntos: [], topicos: [], conceitos: [], textosBrutos: [], flashcards: [] },
  onSuccess,
}: CreateNodeModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"create" | "existing">("create");
  const [selectedType, setSelectedType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<{
    flashcards: Array<{ id: string; label: string; fullText: string; tipo: string; hierarquia: string; conceitoId?: string | null }>;
    notas: Array<{ id: string; label: string; fullText: string; tipo: string; hierarquia: string; conceitoId?: string | null }>;
    provas: Array<{ id: string; label: string; fullText: string; tipo: string; hierarquia: string }>;
  }>({ flashcards: [], notas: [], provas: [] });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<NotaRelationSuggestion & { accepted: boolean }>
  >([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // BARALHO (deck): flashcards do usuário e seleção
  const [deckFlashcards, setDeckFlashcards] = useState<Array<{ id: string; pergunta: string; conceito: string | null }>>([]);
  const [deckSelected, setDeckSelected] = useState<Set<string>>(new Set());
  const [deckSearch, setDeckSearch] = useState("");
  // tópico: conjunto de assuntos relacionados (relação + peso) escolhidos na criação
  const [topicoAssuntos, setTopicoAssuntos] = useState<TopicoAssuntoLink[]>([]);
  // conceito: conjunto de tópicos relacionados (relação + peso)
  const [conceitoTopicos, setConceitoTopicos] = useState<ConceitoTopicoLink[]>([]);
  // flashcard: conjunto de conceitos relacionados (relação + peso)
  const [flashcardConceitos, setFlashcardConceitos] = useState<FlashcardConceitoLink[]>([]);
  // nota: conjunto de conceitos relacionados (relação + peso), além das sugestões da IA
  const [notaConceitos, setNotaConceitos] = useState<NotaConceitoLink[]>([]);
  // nota: texto bruto de origem (no máximo 1) — relação GERA, do texto para a nota
  const [notaTextoBrutoId, setNotaTextoBrutoId] = useState<string>("");
  // PROVA: modo (selecionar existente ou importar arquivos)
  const [provaSubMode, setProvaSubMode] = useState<"existing" | "upload">("existing");
  const [selectedProvaId, setSelectedProvaId] = useState<string>("");
  const [provaSearchQuery, setProvaSearchQuery] = useState<string>("");
  // PROVA upload: passos files → reviewing → review
  const [provaUploadStep, setProvaUploadStep] = useState<"files" | "reviewing" | "review">("files");
  const [provaFile, setProvaFile] = useState<File | null>(null);
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
  const [parsedQuestoes, setParsedQuestoes] = useState<ParsedQuestao[]>([]);
  const [parsedTitulo, setParsedTitulo] = useState<string>("");

  const [formData, setFormData] = useState<{
    nome: string;
    descricao: string;
    assuntoId: string;
    topicoId: string;
    conceitoId: string;
    pergunta: string;
    resposta: string;
    conteudo: string;
    tipoNota: string;
    subtipo: string;
    fonte: string;
  }>({
    nome: "",
    descricao: "",
    assuntoId: "",
    topicoId: "",
    conceitoId: "",
    pergunta: "",
    resposta: "",
    conteudo: "",
    tipoNota: "PERMANENTE",
    subtipo: "",
    fonte: "",
  });

  // Muda o tipo e volta à aba "create" quando o novo tipo não tem aba de
  // existentes (evita um setState-in-effect só para sincronizar a aba).
  const changeType = (type: string): void => {
    setSelectedType(type);
    if (type && type !== "FLASHCARD" && type !== "NOTA") setActiveTab("create");
  };

  // Carrega os itens disponíveis ao abrir na aba de existentes ou em PROVA
  // (fetch assíncrono no effect — sem setState síncrono).
  useEffect(() => {
    if (!open || !(activeTab === "existing" || selectedType === "PROVA")) return;
    let ignore = false;
    graphHttp
      .getAvailableItems(grafoId)
      .then((data): void => {
        if (!ignore) setAvailableItems({ flashcards: data.flashcards ?? [], notas: data.notas ?? [], provas: data.provas ?? [] });
      })
      .catch((e): void => {
        if (!ignore) toast.error(`Erro ao carregar itens disponíveis: ${e instanceof Error ? e.message : "Erro desconhecido"}`);
      });
    return (): void => { ignore = true; };
  }, [open, activeTab, selectedType, grafoId]);

  // Carrega os flashcards ao criar um BARALHO (só flashcards já no grafo). O
  // `deckLoading` é DERIVADO de uma chave, evitando setState síncrono no effect.
  const deckKey = open && selectedType === "BARALHO" ? parentIds.flashcards.map((f) => f.id).join(",") : "";
  const [deckLoadedKey, setDeckLoadedKey] = useState<string | null>(null);
  useEffect(() => {
    if (open === false || selectedType !== "BARALHO") return;
    let ignore = false;
    const noGrafo = new Set(parentIds.flashcards.map((f) => f.id));
    graphHttp
      .listUserFlashcards()
      .then((fcs): void => {
        if (!ignore) setDeckFlashcards(fcs.filter((f) => noGrafo.has(f.id)).map((f) => ({ id: f.id, pergunta: f.pergunta, conceito: f.conceito })));
      })
      .catch((): void => { if (!ignore) toast.error("Erro ao carregar flashcards"); })
      .finally((): void => { if (!ignore) setDeckLoadedKey(deckKey); });
    return (): void => { ignore = true; };
  }, [open, selectedType, parentIds.flashcards, deckKey]);
  const deckLoading = deckKey !== "" && deckLoadedKey !== deckKey;

  const resetForm = () => {
    setActiveTab("create");
    setSelectedType("");
    setAiSuggestions([]);
    setSelectedItems(new Set());
    setSearchQuery("");
    setDeckSelected(new Set());
    setDeckSearch("");
    setTopicoAssuntos([]);
    setConceitoTopicos([]);
    setFlashcardConceitos([]);
    setNotaConceitos([]);
    setNotaTextoBrutoId("");
    setProvaSubMode("existing");
    setSelectedProvaId("");
    setProvaSearchQuery("");
    setProvaUploadStep("files");
    setProvaFile(null);
    setGabaritoFile(null);
    setParsedQuestoes([]);
    setParsedTitulo("");
    setFormData({
      nome: "",
      descricao: "",
      assuntoId: "",
      topicoId: "",
      conceitoId: "",
      pergunta: "",
      resposta: "",
      conteudo: "",
      tipoNota: "PERMANENTE",
      subtipo: "",
      fonte: "",
    });
  };

  const handleSuggestRelations = async () => {
    if (!formData.nome.trim() || !formData.conteudo.trim()) {
      toast.error("Preencha o título e o texto antes de pedir sugestões");
      return;
    }
    setAiLoading(true);
    try {
      const suggestions = await graphHttp.suggestNotaRelations(
        grafoId,
        formData.nome.trim(),
        formData.conteudo.trim()
      );
      if (suggestions.length === 0) {
        toast.info("A IA não encontrou relações pertinentes no grafo atual.");
      }
      setAiSuggestions(suggestions.map((sg) => ({ ...sg, accepted: true })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao sugerir relações");
    } finally {
      setAiLoading(false);
    }
  };

  // fecha o modal + notifica sucesso após uma submissão bem-sucedida
  const finishSubmit = (): void => {
    resetForm();
    onOpenChange(false);
    onSuccess?.();
    router.refresh();
  };

  const submitBaralho = async (): Promise<void> => {
    if (!formData.nome.trim()) return void toast.error("Digite um título para o baralho");
    setLoading(true);
    try {
      await createDeck(graphHttp, grafoId, formData.nome, Array.from(deckSelected));
      toast.success(deckSelected.size > 0 ? `Baralho criado com ${deckSelected.size} flashcard(s)!` : "Baralho criado (vazio)!");
      finishSubmit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar baralho");
    } finally {
      setLoading(false);
    }
  };

  const submitProvaExisting = async (): Promise<void> => {
    if (!selectedProvaId) return void toast.error("Selecione uma prova");
    setLoading(true);
    try {
      await graphHttp.addProvaToGraph(grafoId, selectedProvaId);
      toast.success("Prova adicionada ao grafo!");
      finishSubmit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar prova");
    } finally {
      setLoading(false);
    }
  };

  const submitProvaSave = async (): Promise<void> => {
    if (!parsedTitulo.trim()) return void toast.error("Informe o título da prova");
    setLoading(true);
    try {
      const { provaId } = await graphHttp.createProvaFromParsed({ titulo: parsedTitulo.trim(), questoes: parsedQuestoes });
      await graphHttp.addProvaToGraph(grafoId, provaId);
      toast.success(`Prova criada com ${parsedQuestoes.length} questões e adicionada ao grafo!`);
      finishSubmit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar prova");
    } finally {
      setLoading(false);
    }
  };

  const submitProvaParse = async (): Promise<void> => {
    if (!provaFile || !gabaritoFile) return void toast.error("Selecione os dois arquivos (prova e gabarito)");
    setProvaUploadStep("reviewing");
    setLoading(true);
    try {
      const result = await graphHttp.parseProvaUpload(provaFile, gabaritoFile);
      setParsedQuestoes(result.questoes);
      setParsedTitulo(result.tituloSugerido ?? "");
      setProvaUploadStep("review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar arquivos");
      setProvaUploadStep("files");
    } finally {
      setLoading(false);
    }
  };

  const submitProva = (): Promise<void> => {
    if (provaSubMode === "existing") return submitProvaExisting();
    if (provaUploadStep === "review") return submitProvaSave();
    return submitProvaParse();
  };

  const submitCreateNode = async (): Promise<void> => {
    const validationError = validateCreateNodeForm(selectedType, formData);
    if (validationError) return void toast.error(createNodeErrorMessage(validationError, selectedType));
    setLoading(true);
    try {
      const { createdEdges } = await createGraphNode(graphHttp, {
        grafoId,
        type: selectedType,
        form: formData,
        topicoAssuntos,
        conceitoTopicos,
        flashcardConceitos,
        notaConceitos,
        acceptedSuggestions: aiSuggestions.filter((s) => s.accepted).map((s) => ({ nodeId: s.nodeId, relacao: s.relacao })),
        notaTextoBrutoId,
      });
      toast.success(createdEdges > 0 ? `Nó criado com ${createdEdges} relação(ões)!` : "Nó criado com sucesso!");
      finishSubmit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar nó");
    } finally {
      setLoading(false);
    }
  };

  const submitAddExisting = async (): Promise<void> => {
    const itemsToAdd = Array.from(selectedItems);
    if (itemsToAdd.length === 0) return void toast.error("Selecione pelo menos um item para adicionar");
    setLoading(true);
    try {
      const { createdEdges } = await addExistingItems(graphHttp, {
        grafoId,
        type: selectedType,
        itemIds: itemsToAdd,
        flashcards: availableItems.flashcards,
        notas: availableItems.notas,
        flashcardConceitos,
        notaConceitos,
        notaTextoBrutoId,
      });
      const suffix = createdEdges > 0 ? ` com ${createdEdges} relação(ões)!` : " ao grafo!";
      toast.success(`${itemsToAdd.length} item(s) adicionado(s)${suffix}`);
      finishSubmit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao adicionar itens");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (): Promise<void> => {
    if (activeTab !== "create") return submitAddExisting();
    if (!selectedType) {
      toast.error("Selecione um tipo de nó");
      return Promise.resolve();
    }
    if (selectedType === "BARALHO") return submitBaralho();
    if (selectedType === "PROVA") return submitProva();
    return submitCreateNode();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  // Flashcards disponíveis filtrados apenas pela busca (pergunta/conceito/hierarquia).
  const filteredFlashcards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableItems.flashcards;
    return availableItems.flashcards.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.fullText.toLowerCase().includes(q) ||
        f.hierarquia.toLowerCase().includes(q)
    );
  }, [availableItems.flashcards, searchQuery]);

  // Bloco de "Conceitos relacionados" do flashcard (relação + peso, sem repetir).
  // Reutilizado tanto ao criar um flashcard quanto ao adicionar existentes.
  const renderFlashcardConceitos = () => (
    <RelationLinkList
      links={flashcardConceitos.map((l) => ({ targetId: l.conceitoId, relacao: l.relacao, peso: l.peso }))}
      onChange={(rows) =>
        setFlashcardConceitos(rows.map((r) => ({ conceitoId: r.targetId, relacao: r.relacao, peso: r.peso })))
      }
      options={parentIds.conceitos}
      relations={FLASHCARD_CONCEITO_RELATIONS}
      title="Conceitos relacionados (opcional)"
      emptyMessage="Nenhum conceito no grafo para relacionar."
      addLabel="Adicionar conceito"
    />
  );

  // Texto bruto de origem da nota (no máximo 1) — relação GERA.
  // Reutilizado ao criar uma nota e ao adicionar notas existentes.
  const renderNotaTextoBruto = () => (
    <div className="space-y-1.5">
      <Label>Texto bruto de origem (opcional)</Label>
      {parentIds.textosBrutos.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum texto bruto no grafo para relacionar.
        </p>
      ) : (
        <div className="flex items-center gap-1.5">
          <Select
            value={notaTextoBrutoId || "__none__"}
            onValueChange={(value) =>
              setNotaTextoBrutoId(value === "__none__" ? "" : value ?? "")
            }
          >
            <SelectTrigger className="flex-1 min-w-0">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {parentIds.textosBrutos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        O texto bruto gera esta nota. Uma nota tem no máximo um texto de origem.
      </p>
    </div>
  );

  // Bloco de "Conceitos relacionados" da nota (relação + peso, sem repetir).
  // Reutilizado ao criar uma nota e ao adicionar notas existentes.
  const renderNotaConceitos = () => (
    <RelationLinkList
      links={notaConceitos.map((l) => ({ targetId: l.conceitoId, relacao: l.relacao, peso: l.peso }))}
      onChange={(rows) =>
        setNotaConceitos(rows.map((r) => ({ conceitoId: r.targetId, relacao: r.relacao, peso: r.peso })))
      }
      options={parentIds.conceitos}
      relations={NOTA_CONCEITO_RELATIONS}
      title="Conceitos relacionados (opcional)"
      emptyMessage="Nenhum conceito no grafo para relacionar."
      addLabel="Adicionar conceito"
    />
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>Adicionar nós ao grafo</DialogTitle>
          <DialogDescription>
            Crie novos nós ou adicione flashcards e notas existentes ao grafo.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs - Only show "Adicionar existentes" for FLASHCARD or NOTA */}
        <div className="shrink-0 mt-4 flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === "create"
                ? "border-b-2 border-primary text-primary"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Criar novo
          </button>
          {(selectedType === "FLASHCARD" || selectedType === "NOTA") && (
            <button
              onClick={() => setActiveTab("existing")}
              className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                activeTab === "existing"
                  ? "border-b-2 border-primary text-primary"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              Adicionar existentes
            </button>
          )}
        </div>

        {/* Corpo rolável — cabeçalho, abas e rodapé ficam fixos */}
        <div className="min-h-0 flex-1 overflow-y-auto py-4 px-1 -mx-1">
        {activeTab === "existing" && (
          <>
            <ExistingItemsPicker
              type={selectedType as "FLASHCARD" | "NOTA"}
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              flashcards={availableItems.flashcards}
              filteredFlashcards={filteredFlashcards}
              notas={availableItems.notas}
              selectedItems={selectedItems}
              onToggle={(id) =>
                setSelectedItems((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
            />

            {/* Mesmas relações com conceitos do "Criar flashcard": aplicadas a
                cada flashcard existente selecionado */}
            {selectedType === "FLASHCARD" && (
              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                {renderFlashcardConceitos()}
                <p className="mt-1 text-xs text-muted-foreground">
                  As relações escolhidas serão criadas para cada flashcard selecionado.
                </p>
              </div>
            )}

            {/* Mesmas relações do "Criar nota": texto bruto de origem + conceitos,
                aplicadas a cada nota existente selecionada */}
            {selectedType === "NOTA" && (
              <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                {renderNotaTextoBruto()}
                {renderNotaConceitos()}
                <p className="text-xs text-muted-foreground">
                  As relações escolhidas serão criadas para cada nota selecionada.
                </p>
              </div>
            )}
          </>
        )}

          {/* CREATE TAB: Form content */}
          {activeTab === "create" && (
            <>
              {/* Type selection */}
              <NodeTypeSelect value={selectedType} onChange={changeType} />

              {/* BARALHO form */}
              {selectedType === "BARALHO" && (
                <DeckForm
                  titulo={formData.nome}
                  onTitulo={(value) => setFormData((f) => ({ ...f, nome: value }))}
                  flashcards={deckFlashcards}
                  loading={deckLoading}
                  selected={deckSelected}
                  onToggle={(id) =>
                    setDeckSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                  search={deckSearch}
                  onSearch={setDeckSearch}
                />
              )}

              {/* PROVA form */}
              {selectedType === "PROVA" && (
                <ProvaForm
                  provas={availableItems.provas}
                  subMode={provaSubMode}
                  onSubModeChange={(mode) => { setProvaSubMode(mode); setProvaUploadStep("files"); }}
                  searchQuery={provaSearchQuery}
                  onSearchChange={setProvaSearchQuery}
                  selectedProvaId={selectedProvaId}
                  onSelectProva={setSelectedProvaId}
                  uploadStep={provaUploadStep}
                  provaFile={provaFile}
                  onProvaFile={setProvaFile}
                  gabaritoFile={gabaritoFile}
                  onGabaritoFile={setGabaritoFile}
                  parsedTitulo={parsedTitulo}
                  onParsedTitulo={setParsedTitulo}
                  parsedQuestoes={parsedQuestoes}
                />
              )}

              {/* ASSUNTO form */}
              {selectedType === "ASSUNTO" && (
                <div className="space-y-3">
                  <NameDescriptionFields
                    idPrefix="assunto"
                    nome={formData.nome}
                    descricao={formData.descricao}
                    onNome={(value) => setFormData((f) => ({ ...f, nome: value }))}
                    onDescricao={(value) => setFormData((f) => ({ ...f, descricao: value }))}
                    nomePlaceholder="Ex: Direito Constitucional"
                    descricaoPlaceholder="Breve descrição do assunto"
                  />
                </div>
              )}

              {/* TOPICO form */}
              {selectedType === "TOPICO" && (
                <div className="space-y-3">
                  <NameDescriptionFields
                    idPrefix="topico"
                    nome={formData.nome}
                    descricao={formData.descricao}
                    onNome={(value) => setFormData((f) => ({ ...f, nome: value }))}
                    onDescricao={(value) => setFormData((f) => ({ ...f, descricao: value }))}
                    nomePlaceholder="Ex: Princípios Fundamentais"
                    descricaoPlaceholder="Breve descrição do tópico"
                  />
                  {/* Assuntos relacionados (relação + peso) — substitui o "assunto pai" */}
                  <RelationLinkList
                    links={topicoAssuntos.map((l) => ({ targetId: l.assuntoId, relacao: l.relacao, peso: l.peso }))}
                    onChange={(rows) =>
                      setTopicoAssuntos(rows.map((r) => ({ assuntoId: r.targetId, relacao: r.relacao, peso: r.peso })))
                    }
                    options={parentIds.assuntos}
                    relations={TOPICO_ASSUNTO_RELATIONS}
                    title="Assuntos relacionados (opcional)"
                    emptyMessage="Nenhum assunto no grafo para relacionar."
                    addLabel="Adicionar assunto"
                  />
                </div>
              )}

              {/* CONCEITO form */}
              {selectedType === "CONCEITO" && (
                <div className="space-y-3">
                  <NameDescriptionFields
                    idPrefix="conceito"
                    nome={formData.nome}
                    descricao={formData.descricao}
                    onNome={(value) => setFormData((f) => ({ ...f, nome: value }))}
                    onDescricao={(value) => setFormData((f) => ({ ...f, descricao: value }))}
                    nomePlaceholder="Ex: Habeas Corpus"
                    descricaoPlaceholder="Breve descrição do conceito"
                  />
                  {/* Tópicos relacionados (relação + peso) — substitui o "tópico pai" */}
                  <RelationLinkList
                    links={conceitoTopicos.map((l) => ({ targetId: l.topicoId, relacao: l.relacao, peso: l.peso }))}
                    onChange={(rows) =>
                      setConceitoTopicos(rows.map((r) => ({ topicoId: r.targetId, relacao: r.relacao, peso: r.peso })))
                    }
                    options={parentIds.topicos}
                    relations={CONCEITO_TOPICO_RELATIONS}
                    title="Tópicos relacionados (opcional)"
                    emptyMessage="Nenhum tópico no grafo para relacionar."
                    addLabel="Adicionar tópico"
                  />
                </div>
              )}

              {/* FLASHCARD form */}
              {selectedType === "FLASHCARD" && (
                <div className="space-y-3">
                  <FlashcardFields
                    pergunta={formData.pergunta}
                    resposta={formData.resposta}
                    onPergunta={(value) => setFormData((f) => ({ ...f, pergunta: value }))}
                    onResposta={(value) => setFormData((f) => ({ ...f, resposta: value }))}
                  />
                  {/* Conceitos relacionados (relação + peso) — o flashcard herda os conceitos */}
                  {renderFlashcardConceitos()}
                </div>
              )}

              {/* NOTA form */}
              {selectedType === "NOTA" && (
                <div className="space-y-3">
                  <NotaFields
                    form={formData}
                    onField={(key, value) => setFormData((f) => ({ ...f, [key]: value }))}
                  />
                  {/* Texto bruto de origem (no máximo 1) — relação GERA */}
                  {renderNotaTextoBruto()}
                  {/* Conceitos relacionados (relação + peso) — manualmente, além da IA */}
                  {renderNotaConceitos()}
                  <NotaAiSuggestions
                    loading={aiLoading}
                    suggestions={aiSuggestions}
                    onSuggest={handleSuggestRelations}
                    onChange={setAiSuggestions}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <>
                <PlusIcon className="size-4" />
                {selectedType === "PROVA"
                  ? provaSubMode === "existing"
                    ? "Vincular prova ao grafo"
                    : provaUploadStep === "review"
                    ? "Criar prova e adicionar ao grafo"
                    : "Processar arquivos"
                  : activeTab === "create"
                  ? "Criar nó"
                  : selectedItems.size > 0
                  ? `Adicionar ${selectedItems.size} item(s)`
                  : "Selecione itens"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
