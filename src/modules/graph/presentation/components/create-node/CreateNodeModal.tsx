import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { getAllowedRelations } from "@/modules/graph/domain/services/relation-rules";
import {
  validateCreateNodeForm,
  type CreateNodeError,
  type CreateNodeFormValues,
} from "@/modules/graph/domain/services/create-node-form";
import type { NotaRelationSuggestion } from "@/modules/graph/application/ports/graph-ai.port";
import type { ParsedQuestao } from "@/modules/graph/application/ports/graph-prova.port";
import type { AvailableItem } from "@/modules/graph/application/ports/graph-data.port";
import {
  initialConceitoEntries,
  toggleConceito,
  addConceito,
  confirmedConceitos,
  type ConceitoPickerEntry,
} from "@/modules/graph/domain/services/prova-conceitos";
import { createGraphNode, createDeck } from "@/modules/graph/application/use-cases/create-graph-node";
import { addExistingItems } from "@/modules/graph/application/use-cases/add-existing-items";
import { mergeImprovedQuestoes, toImproveBatchInput } from "@/modules/graph/domain/services/merge-improved-questoes";
import { useProvaAiConfig } from "@/modules/graph/presentation/hooks/useProvaAiConfig";
import { graphHttp } from "@/modules/graph/infra/http";
import { CreateNodeDialog, type CreateNodeVm } from "./CreateNodeDialog";
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

const TOPICO_ASSUNTO_RELATIONS = getAllowedRelations("TOPICO", "ASSUNTO");
const CONCEITO_TOPICO_RELATIONS = getAllowedRelations("CONCEITO", "TOPICO");
// Na criação manual o flashcard não vem de uma nota, então não usa HERDA.
const FLASHCARD_CONCEITO_RELATIONS = getAllowedRelations("FLASHCARD", "CONCEITO").filter((r) => r !== "HERDA");
const NOTA_CONCEITO_RELATIONS = getAllowedRelations("NOTA", "CONCEITO");

const EMPTY_FORM: CreateNodeFormValues = {
  nome: "",
  descricao: "",
  pergunta: "",
  resposta: "",
  conteudo: "",
  tipoNota: "PERMANENTE",
  subtipo: "",
  fonte: "",
};

type LinkOf<K extends string> = { relacao: string; peso: number } & Record<K, string>;

function toggleSet(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

interface NamedRef {
  id: string;
  nome: string;
}
interface CreateNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  parentIds?: {
    assuntos: NamedRef[];
    topicos: NamedRef[];
    conceitos: NamedRef[];
    textosBrutos: NamedRef[];
    flashcards: NamedRef[];
  };
  // PROVA nodes in the graph, offered when importing an edital (1:1 link).
  provas?: { id: string; label: string }[];
  onSuccess?: () => void;
}

const NO_PARENTS = { assuntos: [], topicos: [], conceitos: [], textosBrutos: [], flashcards: [] };

export function CreateNodeModal({ open, onOpenChange, grafoId, parentIds = NO_PARENTS, provas = [], onSuccess }: CreateNodeModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"create" | "existing">("create");
  const [selectedType, setSelectedType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<{
    flashcards: AvailableItem[];
    notas: AvailableItem[];
    provas: AvailableItem[];
  }>({ flashcards: [], notas: [], provas: [] });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [aiSuggestions, setAiSuggestions] = useState<Array<NotaRelationSuggestion & { accepted: boolean }>>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deckFlashcards, setDeckFlashcards] = useState<Array<{ id: string; pergunta: string; conceito: string | null }>>([]);
  const [deckSelected, setDeckSelected] = useState<Set<string>>(new Set());
  const [deckSearch, setDeckSearch] = useState("");
  const [topicoAssuntos, setTopicoAssuntos] = useState<Array<LinkOf<"assuntoId">>>([]);
  const [conceitoTopicos, setConceitoTopicos] = useState<Array<LinkOf<"topicoId">>>([]);
  const [flashcardConceitos, setFlashcardConceitos] = useState<Array<LinkOf<"conceitoId">>>([]);
  const [notaConceitos, setNotaConceitos] = useState<Array<LinkOf<"conceitoId">>>([]);
  const [notaTextoBrutoId, setNotaTextoBrutoId] = useState<string>("");
  const [provaSubMode, setProvaSubMode] = useState<"existing" | "upload">("existing");
  const [selectedProvaId, setSelectedProvaId] = useState<string>("");
  const [provaSearchQuery, setProvaSearchQuery] = useState<string>("");
  const [provaUploadStep, setProvaUploadStep] = useState<"files" | "reviewing" | "review">("files");
  const [provaFile, setProvaFile] = useState<File | null>(null);
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
  const [editalFile, setEditalFile] = useState<File | null>(null);
  const [editalProvaId, setEditalProvaId] = useState<string>("");
  // "reading" = IA lendo o edital; "saving" = gravando os nós/vínculos no grafo.
  const [editalPhase, setEditalPhase] = useState<"reading" | "saving">("reading");
  const [parsedQuestoes, setParsedQuestoes] = useState<ParsedQuestao[]>([]);
  const [parsedTitulo, setParsedTitulo] = useState<string>("");
  const [conceitosByQuestao, setConceitosByQuestao] = useState<Record<number, ConceitoPickerEntry[]>>({});
  const [conceitosLoading, setConceitosLoading] = useState(false);
  const [formatandoQuestoes, setFormatandoQuestoes] = useState(false);
  const { config: aiConfig, toggle: toggleAi } = useProvaAiConfig();
  const [formData, setFormData] = useState<CreateNodeFormValues>(EMPTY_FORM);

  // Muda o tipo e volta à aba "create" quando o novo tipo não tem aba de existentes.
  const changeType = (type: string): void => {
    setSelectedType(type);
    if (type && type !== "FLASHCARD" && type !== "NOTA") setActiveTab("create");
  };

  // Carrega os itens disponíveis ao abrir na aba de existentes ou em PROVA.
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

  // Carrega os flashcards ao criar um BARALHO (só os já no grafo). deckLoading é DERIVADO.
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

  const filteredFlashcards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableItems.flashcards;
    return availableItems.flashcards.filter(
      (f) => f.label.toLowerCase().includes(q) || f.fullText.toLowerCase().includes(q) || f.hierarquia.toLowerCase().includes(q),
    );
  }, [availableItems.flashcards, searchQuery]);

  const resetForm = (): void => {
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
    setEditalFile(null);
    setEditalProvaId("");
    setEditalPhase("reading");
    setParsedQuestoes([]);
    setParsedTitulo("");
    setConceitosByQuestao({});
    setConceitosLoading(false);
    setFormatandoQuestoes(false);
    setFormData(EMPTY_FORM);
  };

  const finishSubmit = (): void => {
    resetForm();
    onOpenChange(false);
    onSuccess?.();
    router.refresh();
  };

  const handleSuggestRelations = async (): Promise<void> => {
    if (!formData.nome.trim() || !formData.conteudo.trim()) return void toast.error("Preencha o título e o texto antes de pedir sugestões");
    setAiLoading(true);
    try {
      const suggestions = await graphHttp.suggestNotaRelations(grafoId, formData.nome.trim(), formData.conteudo.trim());
      if (suggestions.length === 0) toast.info("A IA não encontrou relações pertinentes no grafo atual.");
      setAiSuggestions(suggestions.map((sg) => ({ ...sg, accepted: true })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao sugerir relações");
    } finally {
      setAiLoading(false);
    }
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

  const setParsedQuestaoGabarito = (index: number, value: string): void =>
    setParsedQuestoes((prev) => prev.map((q, i) => (i === index ? { ...q, gabarito: value } : q)));

  const toggleConceitoForQuestao = (numero: number, nome: string): void =>
    setConceitosByQuestao((prev) => ({ ...prev, [numero]: toggleConceito(prev[numero] ?? [], nome) }));

  const addConceitoForQuestao = (numero: number, nome: string): void =>
    setConceitosByQuestao((prev) => ({ ...prev, [numero]: addConceito(prev[numero] ?? [], nome) }));

  // Concepts confirmed in the review, attached per question for the graph linking.
  const questoesComConceitos = (): ParsedQuestao[] =>
    parsedQuestoes.map((q) => ({ ...q, conceitos: confirmedConceitos(conceitosByQuestao[q.numero] ?? []) }));

  // Optional edital attached during prova import: completes the graph from the notice
  // and links the EDITAL node 1:1 to the freshly-created prova (best-effort).
  const attachEditalIfAny = async (provaId: string): Promise<void> => {
    if (!editalFile || !aiConfig.completarEdital) return;
    const { plan, programa } = await graphHttp.planGraphFromEdital(grafoId, editalFile);
    const built = await graphHttp.buildGraphFromEdital(grafoId, plan);
    await graphHttp.createEditalNode({
      titulo: editalFile.name.replace(/\.[^.]+$/, ""),
      programa,
      grafoId,
      provaId,
      conceitoNodeIds: built.conceitoNodeIds,
    });
  };

  const submitProvaSave = async (): Promise<void> => {
    if (!parsedTitulo.trim()) return void toast.error("Informe o título da prova");
    if (parsedQuestoes.some((q) => !q.gabarito || q.gabarito === "?")) {
      return void toast.error("Informe a alternativa correta de todas as questões");
    }
    setLoading(true);
    try {
      const { provaId } = await graphHttp.createProvaFromParsed({ titulo: parsedTitulo.trim(), questoes: questoesComConceitos(), grafoId });
      await graphHttp.addProvaToGraph(grafoId, provaId);
      await attachEditalIfAny(provaId).catch(() => toast.error("Prova criada, mas falhou ao anexar o edital."));
      toast.success(`Prova criada com ${parsedQuestoes.length} questões e adicionada ao grafo!`);
      finishSubmit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar prova");
    } finally {
      setLoading(false);
    }
  };

  // Best-effort: a suggestion failure never blocks the review (user can add manually).
  const loadConceitoSuggestions = async (questoes: ParsedQuestao[]): Promise<void> => {
    setConceitosLoading(true);
    try {
      const suggestions = await graphHttp.suggestProvaConceitos(questoes);
      setConceitosByQuestao(initialConceitoEntries(suggestions));
    } catch {
      setConceitosByQuestao({});
    } finally {
      setConceitosLoading(false);
    }
  };

  // Formata as questões com IA em lote (uma chamada) DEPOIS que a revisão já apareceu,
  // para não travar a extração numa prova grande. Funde no estado atual (por numero/letra),
  // preservando o gabarito que o usuário já possa ter ajustado. Best-effort: falha = cruas.
  const formatQuestoesInBackground = async (questoes: ParsedQuestao[]): Promise<void> => {
    if (!aiConfig.melhorarFormatacao || questoes.length === 0) return;
    setFormatandoQuestoes(true);
    try {
      const improved = await graphHttp.improveProvaQuestoes(toImproveBatchInput(questoes), ["format", "markdown"]);
      setParsedQuestoes((prev) => mergeImprovedQuestoes(prev, improved));
    } catch {
      // mantém as questões cruas; a melhoria de formatação é opcional
    } finally {
      setFormatandoQuestoes(false);
    }
  };

  const submitProvaParse = async (): Promise<void> => {
    if (!provaFile) return void toast.error("Selecione o arquivo da prova");
    setProvaUploadStep("reviewing");
    setLoading(true);
    try {
      const result = await graphHttp.parseProvaUpload(provaFile, gabaritoFile, aiConfig.aiExtraction);
      setParsedQuestoes(result.questoes);
      setParsedTitulo(result.tituloSugerido ?? "");
      setProvaUploadStep("review");
      void formatQuestoesInBackground(result.questoes);
      if (aiConfig.sugerirConceitos) void loadConceitoSuggestions(result.questoes);
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

  // Import an edital as an EDITAL node: complete the graph from the notice, then create
  // the node (linking it 1:1 to the chosen prova when one is selected).
  const submitEdital = async (): Promise<void> => {
    if (!editalFile) return void toast.error("Selecione o arquivo do edital");
    setEditalPhase("reading");
    setLoading(true);
    try {
      const { plan, programa } = await graphHttp.planGraphFromEdital(grafoId, editalFile);
      setEditalPhase("saving");
      const built = await graphHttp.buildGraphFromEdital(grafoId, plan);
      await graphHttp.createEditalNode({
        titulo: editalFile.name.replace(/\.[^.]+$/, ""),
        programa,
        grafoId,
        provaId: editalProvaId || undefined,
        conceitoNodeIds: built.conceitoNodeIds,
      });
      toast.success(`Edital importado: ${built.assuntos} assuntos, ${built.topicos} tópicos, ${built.conceitos} conceitos.`);
      finishSubmit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar o edital");
    } finally {
      setLoading(false);
    }
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
    const itemIds = Array.from(selectedItems);
    if (itemIds.length === 0) return void toast.error("Selecione pelo menos um item para adicionar");
    setLoading(true);
    try {
      const { createdEdges } = await addExistingItems(graphHttp, {
        grafoId,
        type: selectedType,
        itemIds,
        flashcards: availableItems.flashcards,
        notas: availableItems.notas,
        flashcardConceitos,
        notaConceitos,
        notaTextoBrutoId,
      });
      const suffix = createdEdges > 0 ? ` com ${createdEdges} relação(ões)!` : " ao grafo!";
      toast.success(`${itemIds.length} item(s) adicionado(s)${suffix}`);
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
    if (selectedType === "EDITAL") return submitEdital();
    return submitCreateNode();
  };

  const handleOpenChange = (next: boolean): void => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const vm: CreateNodeVm = {
    open,
    close: handleOpenChange,
    loading,
    submit: handleSubmit,
    activeTab,
    setActiveTab,
    selectedType,
    changeType,
    form: formData,
    setForm: (patch) => setFormData((f) => ({ ...f, ...patch })),
    availableItems,
    filteredFlashcards,
    selectedItems,
    toggleItem: (id) => setSelectedItems((prev) => toggleSet(prev, id)),
    searchQuery,
    setSearchQuery,
    aiSuggestions,
    setAiSuggestions,
    aiLoading,
    suggest: handleSuggestRelations,
    deckFlashcards,
    deckLoading,
    deckSelected,
    toggleDeck: (id) => setDeckSelected((prev) => toggleSet(prev, id)),
    deckSearch,
    setDeckSearch,
    topicoAssuntos: {
      rows: topicoAssuntos.map((l) => ({ targetId: l.assuntoId, relacao: l.relacao, peso: l.peso })),
      onChange: (rows) => setTopicoAssuntos(rows.map((r) => ({ assuntoId: r.targetId, relacao: r.relacao, peso: r.peso }))),
      options: parentIds.assuntos,
      relations: TOPICO_ASSUNTO_RELATIONS,
    },
    conceitoTopicos: {
      rows: conceitoTopicos.map((l) => ({ targetId: l.topicoId, relacao: l.relacao, peso: l.peso })),
      onChange: (rows) => setConceitoTopicos(rows.map((r) => ({ topicoId: r.targetId, relacao: r.relacao, peso: r.peso }))),
      options: parentIds.topicos,
      relations: CONCEITO_TOPICO_RELATIONS,
    },
    flashcardConceitos: {
      rows: flashcardConceitos.map((l) => ({ targetId: l.conceitoId, relacao: l.relacao, peso: l.peso })),
      onChange: (rows) => setFlashcardConceitos(rows.map((r) => ({ conceitoId: r.targetId, relacao: r.relacao, peso: r.peso }))),
      options: parentIds.conceitos,
      relations: FLASHCARD_CONCEITO_RELATIONS,
    },
    notaConceitos: {
      rows: notaConceitos.map((l) => ({ targetId: l.conceitoId, relacao: l.relacao, peso: l.peso })),
      onChange: (rows) => setNotaConceitos(rows.map((r) => ({ conceitoId: r.targetId, relacao: r.relacao, peso: r.peso }))),
      options: parentIds.conceitos,
      relations: NOTA_CONCEITO_RELATIONS,
    },
    notaTextoBrutoId,
    setNotaTextoBrutoId,
    prova: {
      provas: availableItems.provas,
      subMode: provaSubMode,
      setSubMode: (mode) => { setProvaSubMode(mode); setProvaUploadStep("files"); },
      searchQuery: provaSearchQuery,
      setSearchQuery: setProvaSearchQuery,
      selectedProvaId,
      setSelectedProvaId,
      uploadStep: provaUploadStep,
      provaFile,
      setProvaFile,
      gabaritoFile,
      setGabaritoFile,
      editalFile,
      setEditalFile,
      parsedTitulo,
      setParsedTitulo,
      parsedQuestoes,
      setParsedQuestaoGabarito,
      conceitosByQuestao,
      conceitosLoading,
      formatandoQuestoes,
      onToggleConceito: toggleConceitoForQuestao,
      onAddConceito: addConceitoForQuestao,
      aiConfig,
      onToggleAi: toggleAi,
    },
    edital: {
      file: editalFile,
      setFile: setEditalFile,
      provas,
      provaId: editalProvaId,
      setProvaId: setEditalProvaId,
      phase: editalPhase,
    },
  };

  return <CreateNodeDialog vm={vm} parents={parentIds} />;
}
