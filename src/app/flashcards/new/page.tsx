"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2Icon, CheckCircle2Icon, ChevronDownIcon,
  ChevronRightIcon, BrainIcon, XIcon, PlusIcon,
  SparklesIcon, ArrowRightIcon, FileTextIcon,
  FlaskConicalIcon, PlusCircleIcon, LinkIcon,
  SearchIcon, EyeIcon, AlertCircleIcon, LayersIcon,
  ClockIcon, CalendarDaysIcon, ChevronLeftIcon,
} from "lucide-react";
import { toast } from "sonner";
import { getNotas } from "@/lib/notes-api";
import {
  getHierarquiaConceitos,
  createFullConcept,
  createTopico,
  createAssunto,
  createFlashcard,
  previewFlashcardsFromNota,
  saveFlashcardPreviewsFromNota,
  type ConceitoArvore,
  type FlashcardSourceType,
} from "@/lib/content-api";
import { generateFlashcardsViaIA } from "@/lib/ai-api";

type PageMode = "from-nota" | "manual";
type AnalysisMode = "content" | "ia";

// ==========================================
// Shared types
// ==========================================

interface FlashcardPreview {
  id: string;
  pergunta: string;
  resposta: string;
  conceitoId: string;
  conceptNome?: string;
  source: FlashcardSourceType;
}

const SOURCE_CONFIG: Record<FlashcardSourceType, { label: string; icon: string; description: string }> = {
  pergunta_resposta: { label: "Pergunta → Resposta", icon: "🧠", description: "Clássico" },
  cloze: { label: "Cloze", icon: "🔁", description: "Preenchimento" },
  bidirecional: { label: "Bidirecional", icon: "🔄", description: "Ida e volta" },
  explicacao_profunda: { label: "Explicação Profunda", icon: "🧩", description: "Compreensão" },
  comparacao: { label: "Comparação", icon: "⚖️", description: "Diferenças" },
  lista_fragmentada: { label: "Lista Fragmentada", icon: "📊", description: "Pontos-chave" },
  aplicacao_problema: { label: "Aplicação / Problema", icon: "🧠", description: "Raciocínio" },
  identificacao_imagem: { label: "Identificação", icon: "🖼️", description: "Reconhecimento" },
  erro_comum: { label: "Erro Comum", icon: "⚠️", description: "Pegadinha" },
  definicao: { label: "Definição", icon: "📖", description: "Conceito" },
  finalidade: { label: "Finalidade", icon: "🎯", description: "Para que serve" },
  importancia: { label: "Importância", icon: "💡", description: "Por que importa" },
  caracteristicas: { label: "Características", icon: "🔍", description: "Detalhes" },
  diferenca: { label: "Diferença", icon: "⚡", description: "Contraste" },
  conteudo: { label: "Conteúdo", icon: "📝", description: "Texto" },
};

// ==========================================
// "From Nota" mode
// ==========================================

function FromNotaMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [notas, setNotas] = useState<Array<{ id: string; preview: string; dataCriacao: Date; conceitosRelacionados: { nome: string; id: string }[]; flashcardCount: number }>>([]);
  const [loadingNotas, setLoadingNotas] = useState(true);

  const [selectedNotaId, setSelectedNotaId] = useState<string | null>(null);
  const [selectedNotaName, setSelectedNotaName] = useState("");
  const [selectedNotaDate, setSelectedNotaDate] = useState<Date | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("content");
  const [previewCards, setPreviewCards] = useState<FlashcardPreview[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [searchPreview, setSearchPreview] = useState("");

  useEffect(() => {
    getNotas()
      .then((data) => { setNotas(data); setLoadingNotas(false); })
      .catch(() => setLoadingNotas(false));
  }, []);

  const handleGeneratePreview = async (notaId: string, mode: AnalysisMode) => {
    setSelectedNotaId(notaId);
    setAnalysisMode(mode);
    setLoadingPreview(true);
    try {
      const nota = notas.find((n) => n.id === notaId);
      setSelectedNotaName(nota?.preview.split("\n")[0].replace(/^#+\s*/, "") || "Nota");
      setSelectedNotaDate(nota?.dataCriacao ?? null);

      let cards: FlashcardPreview[];
      if (mode === "ia") {
        cards = await generateFlashcardsViaIA(notaId);
      } else {
        cards = await previewFlashcardsFromNota(notaId);
      }

      if (cards.length === 0) {
        toast.info("Nenhum flashcard pôde ser gerado desta nota.");
        setSelectedNotaId(null);
        setPreviewCards([]);
      } else {
        setPreviewCards(cards);
        setSelectedCards(new Set(cards.map((c) => c.id)));
        toast.success(`${cards.length} flashcard(s) encontrado(s)!`);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Erro ao gerar preview.";
      toast.error(msg);
      setSelectedNotaId(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const toggleCard = (id: string) => {
    setSelectedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSaveSelected = async () => {
    const toSave = previewCards.filter((c) => selectedCards.has(c.id));
    if (toSave.length === 0) { toast.warning("Selecione ao menos um flashcard."); return; }
    if (!selectedNotaId) { toast.error("Nota nao identificada."); return; }

    setSaving(true);
    try {
      const result = await saveFlashcardPreviewsFromNota(selectedNotaId, toSave.map((c) => ({
        pergunta: c.pergunta,
        resposta: c.resposta,
        conceitoId: c.conceitoId,
      })));
      setDoneCount(result.count);
      toast.success(`${result.count} flashcard(s) criado(s)!`);
    } catch {
      toast.error("Erro ao salvar flashcards.");
    } finally {
      setSaving(false);
    }
  };

  const handleBackToNotes = () => {
    setSelectedNotaId(null);
    setPreviewCards([]);
    setSelectedCards(new Set());
    setSearchPreview("");
  };

  // Filter preview cards
  const filteredPreview = useMemo(() => {
    if (!searchPreview) return previewCards;
    const l = searchPreview.toLowerCase();
    return previewCards.filter((c) => c.pergunta.toLowerCase().includes(l) || c.resposta.toLowerCase().includes(l));
  }, [searchPreview, previewCards]);

  // ---- Done state ----
  if (doneCount > 0) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
        <CardContent className="py-16 text-center space-y-4">
          <CheckCircle2Icon className="size-12 mx-auto text-emerald-500" />
          <p className="text-xl font-semibold">{doneCount} flashcard(s) criado(s) com sucesso!</p>
          <p className="text-sm text-zinc-500">Os flashcards foram vinculados à nota de origem com relacao GERADO.</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => router.push("/flashcards")}>Ver flashcards</Button>
            <Button onClick={() => { setDoneCount(0); handleBackToNotes(); }}>Gerar mais</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Loading state ----
  if (loadingPreview) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="py-20 text-center space-y-4">
          <Loader2Icon className="size-10 animate-spin text-zinc-400 mx-auto" />
          <p className="text-lg font-medium">
            {analysisMode === "ia" ? "Gerando flashcards com IA..." : "Extraindo flashcards da nota..."}
          </p>
          <p className="text-sm text-zinc-400">
            {analysisMode === "ia" ? "Analisando conteudo e criando tipos variados" : "Identificando definicoes e conceitos"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---- Preview state ----
  if (previewCards.length > 0) {
    const grouped = new Map<string, FlashcardPreview[]>();
    for (const card of filteredPreview) {
      const group = grouped.get(card.source) || [];
      group.push(card);
      grouped.set(card.source, group);
    }
    const totalCount = previewCards.length;
    const filteredCount = filteredPreview.length;
    const selectedCount = Array.from(selectedCards).filter((id) => previewCards.some((c) => c.id === id)).length;

    return (
      <div className="space-y-6">
        {/* Header with note context */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{selectedNotaName}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {selectedNotaDate && `Criada em ${selectedNotaDate.toLocaleDateString("pt-BR")} · `}
                {totalCount} flashcard(s) gerado(s) · {analysisMode === "ia" ? "Análise IA" : "Conteúdo"}
              </p>
            </div>
            <button type="button" onClick={handleBackToNotes} className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1">
              <ChevronLeftIcon className="size-3" />Trocar
            </button>
          </div>
        </div>

        {/* Search + Select All */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nos flashcards..."
              className="pl-9 h-9"
              value={searchPreview}
              onChange={(e) => setSearchPreview(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => setSelectedCards(new Set(previewCards.map((c) => c.id)))}>
              Todas ({totalCount})
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => setSelectedCards(new Set())}>
              Nenhuma
            </Button>
          </div>
        </div>

        {/* Type filter badges */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from(grouped.entries()).map(([source, cards]) => {
            const cfg = SOURCE_CONFIG[source as FlashcardSourceType] || SOURCE_CONFIG.conteudo;
            const allSelected = cards.every((c) => selectedCards.has(c.id));
            return (
              <button
                key={source}
                type="button"
                onClick={() => {
                  const cardIds = cards.map((c) => c.id);
                  setSelectedCards((prev) => {
                    const next = new Set(prev);
                    if (allSelected) cardIds.forEach((id) => next.delete(id));
                    else cardIds.forEach((id) => next.add(id));
                    return next;
                  });
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${allSelected ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label} ({cards.length}/{filteredCount})</span>
              </button>
            );
          })}
        </div>

        {searchPreview && (
          <p className="text-xs text-zinc-400">Mostrando {filteredCount} de {totalCount} flashcard(s)</p>
        )}

        {/* Cards grouped by type */}
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([source, cards]) => {
            const cfg = SOURCE_CONFIG[source as FlashcardSourceType] || SOURCE_CONFIG.conteudo;
            return (
              <div key={source}>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{cfg.icon}</span>
                  {cfg.label}
                  <span className="text-[10px] font-normal text-zinc-500">— {cfg.description}</span>
                  <span className="ml-auto text-zinc-400 font-normal">{cards.length}</span>
                </h3>
                <div className="space-y-1.5">
                  {cards.map((fc) => {
                    const isSelected = selectedCards.has(fc.id);
                    return (
                      <Card key={fc.id} className={`transition-all border-zinc-200 dark:border-zinc-800 ${isSelected ? "border-primary/20 bg-primary/[0.015]" : "opacity-40 hover:opacity-70"}`}>
                        <button type="button" onClick={() => toggleCard(fc.id)} className="w-full text-left">
                          <CardContent className="pt-3 px-3 sm:px-5">
                            <div className="flex items-start gap-2.5">
                              <div className={`mt-0.5 size-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                                {isSelected && <CheckCircle2Icon className="size-3 text-primary-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-snug">{fc.pergunta}</p>
                                <p className="text-xs text-zinc-400 mt-1 leading-relaxed whitespace-pre-line line-clamp-3">{fc.resposta}</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {fc.conceptNome && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5">{fc.conceptNome}</Badge>
                                  )}
                                  <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                                    {cfg.icon} {cfg.label}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </button>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {filteredPreview.length === 0 && searchPreview && (
          <div className="text-center py-8 text-zinc-400">
            <SearchIcon className="size-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum resultado para &quot;{searchPreview}&quot;</p>
          </div>
        )}

        <Separator />

        {/* Save bar */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button variant="outline" onClick={handleBackToNotes} className="w-full sm:w-auto">
            Trocar nota
          </Button>
          <Button onClick={handleSaveSelected} disabled={saving || selectedCount === 0} size="lg" className="w-full sm:w-auto">
            {saving ? (<><Loader2Icon className="size-4 mr-1 animate-spin" /> Salvando...</>) : (
              <><CheckCircle2Icon className="size-4 mr-1" /> Salvar {selectedCount} flashcard(s)</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ---- Select nota state ----
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Escolha uma nota</h2>
        <p className="text-xs text-zinc-400">{notas.length} nota(s)</p>
      </div>
      {loadingNotas ? (
        <div className="flex items-center gap-2 text-sm text-zinc-400 py-12 justify-center"><Loader2Icon className="size-4 animate-spin" /> Carregando notas...</div>
      ) : notas.length === 0 ? (
        <div className="text-center py-12">
          <FileTextIcon className="size-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-500">Nenhuma nota disponivel.</p>
          <Button variant="link" className="text-xs mt-1" onClick={() => router.push("/notes/new")}>Criar nota</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {notas.map((nota) => (
            <Card key={nota.id} className="border-zinc-200 dark:border-zinc-800 hover:border-primary/30 transition-colors">
              <CardContent className="py-3 px-3 sm:px-4">
                {/* Info */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium line-clamp-1">
                      {nota.preview.split("\n")[0].replace(/^#+\s*/, "") || "Sem titulo"}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{nota.preview}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {nota.conceitosRelacionados.length > 0 && (
                        <>
                          {nota.conceitosRelacionados.slice(0, 4).map((c) => (
                            <Badge key={c.id} variant="outline" className="text-[10px] h-4 px-1">{c.nome}</Badge>
                          ))}
                          {nota.conceitosRelacionados.length > 4 && (
                            <span className="text-[10px] text-zinc-400">+{nota.conceitosRelacionados.length - 4}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {nota.flashcardCount > 0 ? (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{nota.flashcardCount} FC</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-emerald-500 border-emerald-300">Novo</Badge>
                    )}
                    {nota.dataCriacao && (
                      <span className="text-[10px] text-zinc-400">{new Date(nota.dataCriacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    )}
                  </div>
                </div>
                {/* Generation buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-9"
                    onClick={() => handleGeneratePreview(nota.id, "content")}
                  >
                    <FlaskConicalIcon className="size-3.5 mr-1.5" />
                    Analise conteudo
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-9"
                    onClick={() => handleGeneratePreview(nota.id, "ia")}
                  >
                    <SparklesIcon className="size-3.5 mr-1.5" />
                    Gerar com IA
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Manual mode
// ==========================================

type ManualCardType =
  | "pergunta_resposta"
  | "cloze"
  | "bidirecional"
  | "explicacao_profunda"
  | "comparacao"
  | "lista_fragmentada"
  | "aplicacao_problema"
  | "erro_comum";

const MANUAL_TYPES: Array<{ value: ManualCardType; label: string; icon: string; description: string }> = [
  { value: "pergunta_resposta", label: "P. → R.", icon: "🧠", description: "Pergunta direta com resposta" },
  { value: "cloze", label: "Cloze", icon: "🔁", description: "Preenchimento de lacuna" },
  { value: "bidirecional", label: "Bidirecional", icon: "🔄", description: "Ida e volta" },
  { value: "explicacao_profunda", label: "Expl. Profunda", icon: "🧩", description: "Compreensao detalhada" },
  { value: "comparacao", label: "Comparacao", icon: "⚖️", description: "Diferencas entre conceitos" },
  { value: "lista_fragmentada", label: "Lista", icon: "📊", description: "Pontos-chave (max 4)" },
  { value: "aplicacao_problema", label: "Problema", icon: "🔮", description: "Cenario de raciocinio" },
  { value: "erro_comum", label: "Erro Comum", icon: "⚠️", description: "Pegadinha frequente" },
];

// Concept node for flat list
interface FlatConcept {
  id: string;
  nome: string;
  topicoNome: string;
  topicoId: string;
  assuntoNome: string;
  assuntoId: string;
}

function ManualModeContent({ router }: { router: ReturnType<typeof useRouter> }) {
  const [tipo, setTipo] = useState<ManualCardType>("pergunta_resposta");
  const [saving, setSaving] = useState(false);

  // Form fields per type
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [frase, setFrase] = useState("");
  const [lacuna, setLacuna] = useState("");
  const [perguntaIda, setPerguntaIda] = useState("");
  const [perguntaVolta, setPerguntaVolta] = useState("");
  const [respostaIda, setRespostaIda] = useState("");
  const [respostaVolta, setRespostaVolta] = useState("");
  const [conceitoA, setConceitoA] = useState("");
  const [conceitoB, setConceitoB] = useState("");
  const [explicacaoComp, setExplicacaoComp] = useState("");
  const [temaLista, setTemaLista] = useState("");
  const [itens, setItens] = useState<string[]>(["", "", ""]);
  const [cenario, setCenario] = useState("");
  const [explicacaoApp, setExplicacaoApp] = useState("");
  const [temaErro, setTemaErro] = useState("");
  const [erro, setErro] = useState("");
  const [correto, setCorreto] = useState("");

  // Concept data
  const [arvore, setArvore] = useState<ConceitoArvore[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(true);

  // Selected concept (existing or pending)
  const [selectedConceptId, setSelectedConceptId] = useState("");
  const [conceptSearch, setConceptSearch] = useState("");

  // Expand state for tree
  const [expandedAssuntos, setExpandedAssuntos] = useState<Set<string>>(new Set());
  const [expandedRelAssuntos, setExpandedRelAssuntos] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedRelTopicos, setExpandedRelTopicos] = useState<Set<string>>(new Set());
  const [conceptMap, setConceptMap] = useState<Map<string, { nome: string; topicoNome: string; assuntoNome: string }>>(new Map());

  // Flat concepts for search/select
  const [flatConcepts, setFlatConcepts] = useState<FlatConcept[]>([]);
  const [showFlatList, setShowFlatList] = useState(false);

  // New concept creation
  const [newConceitoNome, setNewConceitoNome] = useState("");
  const [pendingConcepts, setPendingConcepts] = useState<Array<{ tempId: string; nome: string; relsToTopics: Array<{ targetTopicoId: string; tipoRelacao: string }>; relsToPendingTopics: Array<{ tempTopicoId: string; tipoRelacao: string }> }>>([]);
  const [pendingTopics, setPendingTopics] = useState<Array<{ tempId: string; nome: string; relsToAssuntos: Array<{ targetAssuntoId: string; tipoRelacao: string }> }>>([]);
  const [pendingAssuntos, setPendingAssuntos] = useState<Array<{ tempId: string; nome: string }>>([]);
  const [newConceptRelMode, setNewConceptRelMode] = useState<"existing" | "new">("existing");
  const [selectedExistingTopics, setSelectedExistingTopics] = useState<Array<{ id: string; tipoRelacao: string }>>([]);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicSelectedAssuntos, setNewTopicSelectedAssuntos] = useState<Array<{ id: string; nome: string; tipoRelacao: string }>>([]);
  const [newAssuntoNome, setNewAssuntoNome] = useState("");
  const [nextTempId, setNextTempId] = useState(1);

  const getNextTempId = () => {
    const id = nextTempId;
    setNextTempId(p => p + 1);
    return id;
  };

  // Load hierarchy
  useEffect(() => {
    setLoadingConcepts(true);
    getHierarquiaConceitos().then((tree) => {
      setArvore(tree);
      const cMap = new Map<string, { nome: string; topicoNome: string; assuntoNome: string }>();
      const flat: FlatConcept[] = [];
      for (const ass of tree) {
        for (const relAT of ass.relAssuntoTopico) {
          for (const top of relAT.topicos) {
            for (const relTC of top.relacoesTopicoConceito) {
              for (const conc of relTC.conceitos) {
                cMap.set(conc.id, { nome: conc.nome, topicoNome: top.nome, assuntoNome: ass.nome });
                flat.push({ id: conc.id, nome: conc.nome, topicoNome: top.nome, topicoId: top.id, assuntoNome: ass.nome, assuntoId: ass.id });
              }
            }
          }
        }
      }
      flat.sort((a, b) => a.nome.localeCompare(b.nome));
      setConceptMap(cMap);
      setFlatConcepts(flat);
      setLoadingConcepts(false);
    }).catch(() => { setLoadingConcepts(false); });
  }, []);

  const toggleAssunto = (id: string) => setExpandedAssuntos((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleRelAssunto = (id: string) => setExpandedRelAssuntos((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleTopico = (id: string) => setExpandedTopics((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleRelTopico = (id: string) => setExpandedRelTopicos((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const setItem = (i: number, v: string) => setItens((p) => { const n = [...p]; n[i] = v; return n; });

  // Filtered flat concepts
  const filteredFlat = useMemo(() => {
    if (!conceptSearch) return flatConcepts;
    const l = conceptSearch.toLowerCase();
    return flatConcepts.filter((c) => c.nome.toLowerCase().includes(l) || c.topicoNome.toLowerCase().includes(l) || c.assuntoNome.toLowerCase().includes(l));
  }, [flatConcepts, conceptSearch]);

  // Concept creation helpers
  const getTopicoName = (id: string): string => {
    for (const a of arvore) {
      for (const rel of a.relAssuntoTopico) {
        const found = rel.topicos.find((t) => t.id === id);
        if (found) return found.nome;
      }
    }
    const pt = pendingTopics.find((t) => t.tempId === id);
    return pt?.nome || id;
  };

  const getAssuntoName = (id: string): string => {
    const real = arvore.find((a) => a.id === id);
    if (real) return real.nome;
    const pa = pendingAssuntos.find((a) => a.tempId === id);
    return pa?.nome || "";
  };

  const allExistingTopicos = arvore.flatMap((a) =>
    a.relAssuntoTopico.flatMap((r) => r.topicos.map((t) => ({
      id: t.id, nome: t.nome, assuntoId: a.id, assuntoNome: a.nome
    })))
  );

  const toggleExistingTopicSelect = (tid: string, defaultType: string) => {
    setSelectedExistingTopics((prev) =>
      prev.some((item) => item.id === tid)
        ? prev.filter((item) => item.id !== tid)
        : [...prev, { id: tid, tipoRelacao: defaultType }]
    );
  };

  const updateExistingTopicRelType = (id: string, tipo: string) => {
    setSelectedExistingTopics((prev) =>
      prev.map((item) => item.id === id ? { ...item, tipoRelacao: tipo } : item)
    );
  };

  const updateAssuntoRelType = (id: string, tipo: string) => {
    setNewTopicSelectedAssuntos((prev) =>
      prev.map((item) => item.id === id ? { ...item, tipoRelacao: tipo } : item)
    );
  };

  const addExistingTopicRelation = () => {
    if (selectedExistingTopics.length === 0 || !newConceitoNome.trim()) return;
    const newTempId = `pc-${Date.now()}-${getNextTempId()}`;
    setPendingConcepts((p) => [...p, {
      tempId: newTempId,
      nome: newConceitoNome.trim(),
      relsToTopics: selectedExistingTopics.map((s) => ({ targetTopicoId: s.id, tipoRelacao: s.tipoRelacao })),
      relsToPendingTopics: [],
    }]);
    setSelectedConceptId(`pending:${newTempId}`);
    setNewConceitoNome("");
    setSelectedExistingTopics([]);
  };

  const addNewTopicRelation = () => {
    if (!newTopicName.trim() || newTopicSelectedAssuntos.length === 0 || !newConceitoNome.trim()) return;
    const ptId = `pt-${Date.now()}-${getNextTempId()}`;
    setPendingTopics((p) => [...p, {
      tempId: ptId,
      nome: newTopicName.trim(),
      relsToAssuntos: newTopicSelectedAssuntos.map((a) => ({ targetAssuntoId: a.id, tipoRelacao: a.tipoRelacao })),
    }]);
    const newConceptTempId = `pc-${Date.now()}-${getNextTempId()}`;
    setPendingConcepts((p) => [...p, {
      tempId: newConceptTempId,
      nome: newConceitoNome.trim(),
      relsToTopics: [],
      relsToPendingTopics: [{ tempTopicoId: ptId, tipoRelacao: "FUNDAMENTA" }],
    }]);
    setSelectedConceptId(`pending:${newConceptTempId}`);
    setNewConceitoNome("");
    setNewTopicName("");
    setNewTopicSelectedAssuntos([]);
  };

  const addPendingAssuntoFn = () => {
    if (!newAssuntoNome.trim()) return;
    setPendingAssuntos((prev) => [...prev, {
      tempId: `pa-${Date.now()}-${getNextTempId()}`,
      nome: newAssuntoNome.trim(),
    }]);
    setNewAssuntoNome("");
  };

  const removePendingConcept = (tempId: string) => {
    setPendingConcepts((p) => p.filter((c) => c.tempId !== tempId));
  };

  // Build card data for preview and save
  const buildCardData = (): Array<{ pergunta: string; resposta: string }> => {
    const cid = selectedConceptId;
    if (!cid) return [];
    switch (tipo) {
      case "pergunta_resposta":
        return [{ pergunta: pergunta.trim(), resposta: resposta.trim() }];
      case "cloze":
        return [{ pergunta: frase.trim() ? `Complete: ${frase}` : "", resposta: lacuna.trim() }];
      case "bidirecional":
        return [
          { pergunta: perguntaIda.trim(), resposta: respostaIda.trim() },
          { pergunta: perguntaVolta.trim(), resposta: respostaVolta.trim() },
        ];
      case "explicacao_profunda":
        return [{ pergunta: pergunta.trim(), resposta: resposta.trim() }];
      case "comparacao":
        return [{ pergunta: conceitoA.trim() && conceitoB.trim() ? `Qual a diferenca entre ${conceitoA} e ${conceitoB}?` : "", resposta: explicacaoComp.trim() }];
      case "lista_fragmentada":
        return [{ pergunta: temaLista.trim() ? `Cite os pontos principais sobre ${temaLista}` : "", resposta: itens.filter(Boolean).map((v, i) => `${i + 1}. ${v}`).join("\n") }];
      case "aplicacao_problema":
        return [{ pergunta: cenario.trim(), resposta: explicacaoApp.trim() }];
      case "erro_comum":
        return [{ pergunta: temaErro.trim() ? `Qual o erro comum sobre ${temaErro}?` : "", resposta: `ERRO: ${erro.trim()}\n\nCORRETO: ${correto.trim()}` }];
    }
  };

  // Validation
  const cards = buildCardData();
  const hasContent = cards.length > 0 && cards.some((c) => c.pergunta.trim());
  const hasAllAnswers = cards.every((c) => c.resposta.trim());
  const hasSelectedConcept = !!selectedConceptId;

  // Form validation per field
  const formErrors: Record<string, boolean> = {};
  switch (tipo) {
    case "pergunta_resposta":
    case "explicacao_profunda":
      formErrors.query = !pergunta.trim();
      formErrors.response = !resposta.trim();
      break;
    case "cloze":
      formErrors.query = !frase.trim();
      formErrors.response = !lacuna.trim();
      break;
    case "bidirecional":
      formErrors.query = !perguntaIda.trim();
      formErrors.response = !respostaIda.trim();
      formErrors.query2 = !perguntaVolta.trim();
      formErrors.response2 = !respostaVolta.trim();
      break;
    case "comparacao":
      formErrors.query = !conceitoA.trim() || !conceitoB.trim();
      formErrors.response = !explicacaoComp.trim();
      break;
    case "lista_fragmentada":
      formErrors.query = !temaLista.trim();
      formErrors.response = !itens.some((v) => v.trim());
      break;
    case "aplicacao_problema":
      formErrors.query = !cenario.trim();
      formErrors.response = !explicacaoApp.trim();
      break;
    case "erro_comum":
      formErrors.query = !temaErro.trim();
      formErrors.response = !erro.trim() || !correto.trim();
      break;
  }

  const handleSave = async () => {
    if (!selectedConceptId) { toast.error("Selecione ou adicione um conceito."); return; }
    if (!hasContent) { toast.error("Preencha os campos obrigatorios."); return; }
    if (!hasAllAnswers) { toast.error("Preencha todas as respostas."); return; }

    const cardsToBuild = buildCardData().filter((c) => c.pergunta.trim() && c.resposta.trim());

    setSaving(true);
    try {
      let effectiveConceptId = selectedConceptId;

      // Create pending resources if any
      if (pendingAssuntos.length > 0 || pendingTopics.length > 0 || pendingConcepts.length > 0) {
        // 1. Create pending assuntos
        const assuntoIdMap = new Map<string, string>();
        for (const pa of pendingAssuntos) {
          const created = await createAssunto(pa.nome);
          assuntoIdMap.set(pa.tempId, created.id);
        }

        // 2. Create pending topics
        const topicIdMap = new Map<string, string>();
        for (const pt of pendingTopics) {
          if (pt.relsToAssuntos.length === 0) continue;
          const firstRel = pt.relsToAssuntos[0];
          const realAssuntoId = assuntoIdMap.get(firstRel.targetAssuntoId) ?? firstRel.targetAssuntoId;
          const created = await createTopico(pt.nome, realAssuntoId);
          topicIdMap.set(pt.tempId, created.id);
        }

        // 3. Create pending concepts
        for (const pc of pendingConcepts) {
          let firstTopicoId: string | undefined;
          if (pc.relsToTopics.length > 0) firstTopicoId = pc.relsToTopics[0].targetTopicoId;
          if (!firstTopicoId && pc.relsToPendingTopics.length > 0) {
            firstTopicoId = topicIdMap.get(pc.relsToPendingTopics[0].tempTopicoId);
          }
          if (!firstTopicoId && arvore.length > 0) {
            for (const rel of arvore[0].relAssuntoTopico) {
              if (rel.topicos.length > 0) { firstTopicoId = rel.topicos[0].id; break; }
            }
          }
          if (firstTopicoId) {
            let foundAssuntoId = "";
            for (const a of arvore) {
              for (const rel of a.relAssuntoTopico) {
                if (rel.topicos.find((tp) => tp.id === firstTopicoId)) { foundAssuntoId = a.id; break; }
              }
              if (foundAssuntoId) break;
            }
            if (!foundAssuntoId) {
              for (const pt of pendingTopics) {
                const cid2 = topicIdMap.get(pt.tempId);
                if (cid2 === firstTopicoId && pt.relsToAssuntos.length > 0) {
                  foundAssuntoId = assuntoIdMap.get(pt.relsToAssuntos[0].targetAssuntoId) ?? pt.relsToAssuntos[0].targetAssuntoId;
                  break;
                }
              }
            }
            if (!foundAssuntoId && arvore.length > 0) foundAssuntoId = arvore[0].id;

            const created = await createFullConcept({ nome: pc.nome, assuntoId: foundAssuntoId, topicoId: firstTopicoId });
            conceptMap.set(created.id, { nome: created.nome, topicoNome: "", assuntoNome: "" });
            effectiveConceptId = created.id;
          }
        }
      }

      for (const card of cardsToBuild) {
        await createFlashcard({ pergunta: card.pergunta, resposta: card.resposta, conceitoId: effectiveConceptId });
      }
      toast.success(`${cardsToBuild.length} flashcard(s) criado(s)!`);
      router.push("/flashcards");
    } catch {
      toast.error("Erro ao criar flashcard(s).");
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = MANUAL_TYPES.find((t) => t.value === tipo)!;

  // Determine which concept is selected for display
  const selectedConceptDisplay = useMemo(() => {
    if (selectedConceptId.startsWith("pending:")) {
      const tempId = selectedConceptId.replace("pending:", "");
      const pc = pendingConcepts.find((c) => c.tempId === tempId);
      return pc ? pc.nome : "";
    }
    return conceptMap.get(selectedConceptId)?.nome || "";
  }, [selectedConceptId, pendingConcepts, conceptMap]);

  // ---- Render ----
  return (
    <div className="space-y-5">
      {/* Step 1: Concept (merged) */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">1</div>
            <div>
              <CardTitle className="text-sm">Conceito</CardTitle>
              <CardDescription className="text-[10px]">Selecione existente ou crie um novo conceito.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-5 space-y-3">
          {/* Search + select */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conceito, topico ou materia..."
              className="pl-9 h-9 text-sm"
              value={conceptSearch}
              onChange={(e) => { setConceptSearch(e.target.value); setShowFlatList(e.target.value.length > 0); }}
              onFocus={() => setShowFlatList(conceptSearch.length > 0)}
            />
          </div>

          {/* Flat searchable list (shown when searching) */}
          {showFlatList && (
            <div className="max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredFlat.length === 0 ? (
                <p className="text-xs text-zinc-400 py-3 px-3 text-center">Nenhum conceito encontrado.</p>
              ) : filteredFlat.slice(0, 30).map((fc) => {
                const isSelected = selectedConceptId === fc.id;
                return (
                  <button key={fc.id} type="button" className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${isSelected ? "bg-primary/[0.04]" : ""}`}
                    onClick={() => { setSelectedConceptId(fc.id); setShowFlatList(false); setConceptSearch(fc.nome); }}>
                    <div className={`size-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                      {isSelected && <CheckCircle2Icon className="size-2.5 text-primary-foreground" />}
                    </div>
                    <span className="text-xs flex-1 truncate">{fc.nome}</span>
                    <span className="text-[10px] text-zinc-400">{fc.assuntoNome} / {fc.topicoNome}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tree (shown when not searching) */}
          {!showFlatList && (
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
              {loadingConcepts ? (
                <div className="flex items-center gap-2 text-sm text-zinc-400 py-6 justify-center"><Loader2Icon className="size-4 animate-spin" /> Carregando...</div>
              ) : arvore.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">Nenhum conceito disponivel. Crie abaixo.</p>
              ) : arvore.map((assunto) => {
                const assExpanded = expandedAssuntos.has(assunto.id);
                return (
                  <div key={assunto.id} className="rounded-md border border-zinc-200 dark:border-zinc-800">
                    <button type="button" className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => toggleAssunto(assunto.id)}>
                      {assExpanded ? <ChevronDownIcon className="size-3.5 text-zinc-400" /> : <ChevronRightIcon className="size-3.5 text-zinc-400" />}
                      <span className="text-sm">{assunto.nome}</span>
                    </button>
                    {assExpanded && (
                      <div className="ml-2 border-l border-zinc-200 dark:border-zinc-700">
                        {assunto.relAssuntoTopico.map((relGrupo) => {
                          const relExpanded = expandedRelAssuntos.has(assunto.id);
                          return (
                            <div key={relGrupo.tipoRelacao}>
                              <button type="button" className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => toggleRelAssunto(assunto.id)}>
                                {relExpanded ? <ChevronDownIcon className="size-3 text-zinc-400" /> : <ChevronRightIcon className="size-3 text-zinc-400" />}
                                <Badge variant="outline" className="text-[10px] h-4 px-1">{relGrupo.tipoRelacao}</Badge>
                              </button>
                              {relExpanded && (
                                <div className="ml-2 border-l border-zinc-200 dark:border-zinc-700">
                                  {relGrupo.topicos.map((topico) => {
                                    const topExpanded = expandedTopics.has(topico.id);
                                    return (
                                      <div key={topico.id}>
                                        <button type="button" className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => toggleTopico(topico.id)}>
                                          {topExpanded ? <ChevronDownIcon className="size-3 text-zinc-400" /> : <ChevronRightIcon className="size-3 text-zinc-400" />}
                                          <span className="text-xs text-zinc-500">{topico.nome}</span>
                                        </button>
                                        {topExpanded && (
                                          <div className="ml-2 border-l border-zinc-200 dark:border-zinc-700">
                                            {topico.relacoesTopicoConceito.map((relTC) => {
                                              const relTCExpanded = expandedRelTopicos.has(topico.id);
                                              return (
                                                <div key={relTC.tipoRelacao}>
                                                  <button type="button" className="w-full flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => toggleRelTopico(topico.id)}>
                                                    {relTCExpanded ? <ChevronDownIcon className="size-2.5 text-zinc-400" /> : <ChevronRightIcon className="size-2.5 text-zinc-400" />}
                                                    <Badge variant="outline" className="text-[9px] h-3.5 px-0.5">{relTC.tipoRelacao}</Badge>
                                                  </button>
                                                  {relTCExpanded && (
                                                    <div className="ml-2 border-l border-zinc-200 dark:border-zinc-700">
                                                      {relTC.conceitos.map((conceito) => {
                                                        const isSelected = selectedConceptId === conceito.id;
                                                        return (
                                                          <button key={conceito.id} type="button" className={`w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 ${isSelected ? "bg-primary/[0.04]" : ""}`}
                                                            onClick={() => { setSelectedConceptId(conceito.id); }}>
                                                            <div className={`size-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-zinc-300 dark:border-zinc-600"}`}>
                                                              {isSelected && <CheckCircle2Icon className="size-2.5" />}
                                                            </div>
                                                            <span className="text-xs text-zinc-700 dark:text-zinc-300">{conceito.nome}</span>
                                                          </button>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected concept badge */}
          {selectedConceptId && selectedConceptDisplay && (
            <div className="flex items-center gap-2">
              <Badge className="text-xs gap-1">
                <CheckCircle2Icon className="size-3" />
                {selectedConceptDisplay}
              </Badge>
              <button type="button" onClick={() => { setSelectedConceptId(""); setConceptSearch(""); }} className="text-[10px] text-zinc-400 hover:text-zinc-600">Limpar</button>
            </div>
          )}

          <Separator />

          {/* Criar novo conceito section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do conceito</Label>
              <Input value={newConceitoNome} onChange={(e) => setNewConceitoNome(e.target.value)} placeholder="Ex: Principio da Legalidade" className="h-9" />
            </div>

            {/* Toggle */}
            <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5 w-fit">
              <button type="button" onClick={() => setNewConceptRelMode("existing")} className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${newConceptRelMode === "existing" ? "bg-white dark:bg-zinc-700 shadow" : "text-zinc-500"}`}>
                Topico existente
              </button>
              <button type="button" onClick={() => setNewConceptRelMode("new")} className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${newConceptRelMode === "new" ? "bg-white dark:bg-zinc-700 shadow" : "text-zinc-500"}`}>
                Novo topico
              </button>
            </div>

            {newConceptRelMode === "existing" && (
              <div className="space-y-2">
                <div className="max-h-36 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
                  {allExistingTopicos.map((topico) => {
                    const sel = selectedExistingTopics.find((s) => s.id === topico.id);
                    return (
                      <div key={topico.id} className="flex items-center gap-2 py-1 px-2">
                        <button type="button" onClick={() => toggleExistingTopicSelect(topico.id, "FUNDAMENTA")} className="flex-shrink-0">
                          <div className={`size-3.5 rounded border flex items-center justify-center ${sel ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                            {sel && <CheckCircle2Icon className="size-3 text-primary-foreground" />}
                          </div>
                        </button>
                        <span className="text-xs flex-1 truncate">{topico.nome} <span className="text-[10px] text-zinc-400">({topico.assuntoNome})</span></span>
                        {sel && (
                          <select value={sel.tipoRelacao} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateExistingTopicRelType(topico.id, e.target.value)} className="h-7 px-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-shrink-0">
                            <option value="FUNDAMENTA">FUNDAMENTA</option>
                            <option value="PERTENCE_A">PERTENCE_A</option>
                            <option value="APLICADO_EM">APLICADO_EM</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedExistingTopics.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400">{selectedExistingTopics.length} topico(s)</span>
                    <button type="button" onClick={() => setSelectedExistingTopics([])} className="text-[10px] text-red-400 hover:text-red-500">Limpar</button>
                  </div>
                )}
                <Button type="button" onClick={addExistingTopicRelation} disabled={selectedExistingTopics.length === 0 || !newConceitoNome.trim()} size="sm" className="w-full">
                  <LinkIcon className="size-3 mr-1" />Adicionar conceito
                </Button>
              </div>
            )}

            {newConceptRelMode === "new" && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-zinc-400">Nome do novo topico</Label>
                  <Input value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} placeholder="Ex: Direito Constitucional" className="h-8" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-zinc-400">Vincular a materias</Label>
                  <div className="max-h-28 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
                    {arvore.map((a) => {
                      const sel = newTopicSelectedAssuntos.find((s) => s.id === a.id);
                      return (
                        <div key={a.id} className="flex items-center gap-2 py-1 px-2">
                          <button type="button" onClick={() => {
                            if (sel) setNewTopicSelectedAssuntos((prev) => prev.filter((x) => x.id !== a.id));
                            else setNewTopicSelectedAssuntos((prev) => [...prev, { id: a.id, nome: a.nome, tipoRelacao: "PERTENCE_A" }]);
                          }} className="flex-shrink-0">
                            <div className={`size-3.5 rounded border flex items-center justify-center ${sel ? "bg-primary/10 border-primary text-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                              {sel && <CheckCircle2Icon className="size-3" />}
                            </div>
                          </button>
                          <span className="text-xs flex-1">{a.nome}</span>
                          {sel && (
                            <select value={sel.tipoRelacao} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateAssuntoRelType(a.id, e.target.value)} className="h-7 px-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-shrink-0">
                              <option value="PERTENCE_A">PERTENCE_A</option>
                              <option value="APLICADO_EM">APLICADO_EM</option>
                            </select>
                          )}
                        </div>
                      );
                    })}
                    {pendingAssuntos.map((pa) => {
                      const sel = newTopicSelectedAssuntos.find((s) => s.id === pa.tempId);
                      return (
                        <div key={pa.tempId} className="flex items-center gap-2 py-1 px-2">
                          <button type="button" onClick={() => {
                            if (sel) setNewTopicSelectedAssuntos((prev) => prev.filter((x) => x.id !== pa.tempId));
                            else setNewTopicSelectedAssuntos((prev) => [...prev, { id: pa.tempId, nome: pa.nome, tipoRelacao: "PERTENCE_A" }]);
                          }} className="flex-shrink-0">
                            <div className={`size-3.5 rounded border flex items-center justify-center ${sel ? "bg-emerald-100 border-emerald-400 text-emerald-600" : "border-zinc-300 dark:border-zinc-600"}`}>
                              {sel && <CheckCircle2Icon className="size-3" />}
                            </div>
                          </button>
                          <span className="text-xs flex-1">{pa.nome}</span>
                          <Badge variant="outline" className="text-[8px] h-3.5 px-0.5 text-emerald-500 border-emerald-300 flex-shrink-0">nova</Badge>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 items-end">
                    <Input value={newAssuntoNome} onChange={(e) => setNewAssuntoNome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newAssuntoNome.trim()) addPendingAssuntoFn(); }} placeholder="Nova materia" className="h-8 flex-1" />
                    <Button type="button" onClick={addPendingAssuntoFn} disabled={!newAssuntoNome.trim()} size="sm" className="h-8"><PlusIcon className="size-3 mr-1" />Materia</Button>
                  </div>
                </div>
                <Button type="button" onClick={addNewTopicRelation} disabled={!newTopicName.trim() || newTopicSelectedAssuntos.length === 0 || !newConceitoNome.trim()} size="sm" className="w-full">
                  <LinkIcon className="size-3 mr-1" />Adicionar conceito
                </Button>
              </div>
            )}
          </div>

          {/* Pending queue */}
          {pendingConcepts.length > 0 && (
            <div className="space-y-1.5 pt-3 border-t">
              <p className="text-xs font-medium text-zinc-500">{pendingConcepts.length} conceito(s) na fila:</p>
              {pendingConcepts.map((pc) => {
                const isTarget = selectedConceptId === `pending:${pc.tempId}`;
                return (
                  <div key={pc.tempId} className={`flex items-start justify-between rounded-md px-3 py-2 border ${isTarget ? "bg-primary/[0.04] border-primary/30" : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"}`}>
                    <div className="min-w-0 flex-1 flex items-start gap-2">
                      {/* Checkmark box to select as target */}
                      <button type="button" onClick={() => setSelectedConceptId(isTarget ? "" : `pending:${pc.tempId}`)} className="flex-shrink-0 mt-0.5">
                        <div className={`size-4 rounded-sm border flex items-center justify-center ${isTarget ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                          {isTarget && <CheckCircle2Icon className="size-3 text-primary-foreground" />}
                        </div>
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{pc.nome}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pc.relsToTopics.map((r, ri) => (
                            <Badge key={ri} variant="outline" className="text-[10px] h-4 px-1">{r.tipoRelacao}: {getTopicoName(r.targetTopicoId)}</Badge>
                          ))}
                          {pc.relsToPendingTopics.map((r) => {
                            const pt = pendingTopics.find((t) => t.tempId === r.tempTopicoId);
                            const assuntoNames = pt?.relsToAssuntos.map(ra => getAssuntoName(ra.targetAssuntoId)) ?? [];
                            return (<Badge key={r.tempTopicoId} variant="secondary" className="text-[10px] h-4 px-1">tp. "{pt?.nome}" → {assuntoNames.join(", ")}</Badge>);
                          })}
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removePendingConcept(pc.tempId); }} className="flex-shrink-0 text-zinc-400 hover:text-red-500 ml-2">
                      <XIcon className="size-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Type */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">2</div>
            <div>
              <CardTitle className="text-sm">Tipo de flashcard</CardTitle>
              <CardDescription className="text-[10px]">Escolha o formato.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-5">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {MANUAL_TYPES.map((t) => {
              const isSel = tipo === t.value;
              return (
                <button key={t.value} type="button" onClick={() => setTipo(t.value)}
                  className={`rounded-lg border p-1.5 text-center transition-all ${isSel ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"}`}>
                  <div className="text-sm">{t.icon}</div>
                  <div className={`text-[10px] font-medium mt-0.5 leading-tight ${isSel ? "text-foreground" : "text-zinc-500"}`}>{t.label}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Content */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">3</div>
            <div>
              <CardTitle className="text-sm flex items-center gap-1.5">
                <span>{typeLabel.icon}</span> {typeLabel.label}
              </CardTitle>
              <CardDescription className="text-[10px]">{typeLabel.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-5 space-y-4">
          {/* Render form fields with validation */}
          {tipo === "pergunta_resposta" && (<>
            <FormTextArea label="Pergunta" value={pergunta} onChange={setPergunta} placeholder="Ex: O que e o principio da legalidade?" error={formErrors.query} minH={80} />
            <FormTextArea label="Resposta" value={resposta} onChange={setResposta} placeholder="Ex: E o principio segundo o qual..." error={formErrors.response} minH={100} />
          </>)}

          {tipo === "cloze" && (<>
            <FormField label="Frase com lacuna" error={formErrors.query}>
              <input value={frase} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrase(e.target.value)} placeholder="Ex: A mitocôndria produz {{...}}." className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
            </FormField>
            <FormField label="Termo da lacuna" error={formErrors.response}>
              <input value={lacuna} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLacuna(e.target.value)} placeholder="Ex: ATP" className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
            </FormField>
          </>)}

          {tipo === "bidirecional" && (<>
            <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Ida</p>
              <FormTextArea label="Pergunta" value={perguntaIda} onChange={setPerguntaIda} placeholder="Ex: O que e ATP?" error={formErrors.query} minH={60} />
              <FormTextArea label="Resposta" value={respostaIda} onChange={setRespostaIda} placeholder="Molecula de energia..." error={formErrors.response} minH={60} />
            </div>
            <Separator />
            <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Volta</p>
              <FormTextArea label="Pergunta" value={perguntaVolta} onChange={setPerguntaVolta} placeholder="Ex: Qual molecula responsavel pela energia?" error={formErrors.query2} minH={60} />
              <FormTextArea label="Resposta" value={respostaVolta} onChange={setRespostaVolta} placeholder="ATP (Adenosina Trifosfato)..." error={formErrors.response2} minH={60} />
            </div>
          </>)}

          {tipo === "explicacao_profunda" && (<>
            <FormTextArea label="Pergunta / Topico" value={pergunta} onChange={setPergunta} placeholder="Ex: Como funciona a fotossíntese?" error={formErrors.query} minH={80} />
            <FormTextArea label="Explicação (etapas)" value={resposta} onChange={setResposta} placeholder="1. A luz solar e absorvida...\n2. A água e decomposta..." error={formErrors.response} minH={140} />
          </>)}

          {tipo === "comparacao" && (<>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Conceito A" error={formErrors.query}>
                <input value={conceitoA} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConceitoA(e.target.value)} placeholder="Ex: Celula procarionte" className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
              </FormField>
              <FormField label="Conceito B" error={formErrors.query}>
                <input value={conceitoB} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConceitoB(e.target.value)} placeholder="Ex: Celula eucarionte" className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
              </FormField>
            </div>
            <FormTextArea label="Explicação / Comparativo" value={explicacaoComp} onChange={setExplicacaoComp} placeholder="- Procarionte: sem nucleo...\n- Eucarionte: com nucleo..." error={formErrors.response} minH={100} />
          </>)}

          {tipo === "lista_fragmentada" && (<>
            <FormField label="Tema" error={formErrors.query}>
              <input value={temaLista} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemaLista(e.target.value)} placeholder="Ex: Funcoes do figado" className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
            </FormField>
            <div className="space-y-2">
              <Label>Itens</Label>
              {itens.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 w-6 text-right">{i + 1}.</span>
                  <input value={item} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItem(i, e.target.value)} placeholder={`Item ${i + 1}`} className="flex-1 h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
                  {item && <XIcon className="size-3.5 text-zinc-300 cursor-pointer flex-shrink-0" onClick={() => setItem(i, "")} />}
                </div>
              ))}
              {itens.length < 4 && (
                <button type="button" onClick={() => setItens((p) => [...p, ""])} className="text-xs text-primary hover:underline flex items-center gap-1"><PlusIcon className="size-3" />Adicionar item</button>
              )}
            </div>
          </>)}

          {tipo === "aplicacao_problema" && (<>
            <FormTextArea label="Cenário / Problema" value={cenario} onChange={setCenario} placeholder="Ex: Um paciente com deficiencia de vitamina B12..." error={formErrors.query} minH={80} />
            <FormTextArea label="Explicação / Solução" value={explicacaoApp} onChange={setExplicacaoApp} placeholder="A deficiencia de B12 compromete..." error={formErrors.response} minH={100} />
          </>)}

          {tipo === "erro_comum" && (<>
            <FormField label="Tema" error={formErrors.query}>
              <input value={temaErro} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemaErro(e.target.value)} placeholder="Ex: Fotossíntese" className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
            </FormField>
            <FormTextArea label="Erro comum" value={erro} onChange={setErro} placeholder="Muitos acham que..." error={formErrors.response} minH={70} accent="red" />
            <FormTextArea label="Explicação correta" value={correto} onChange={setCorreto} placeholder="Na verdade, o correto e..." error={formErrors.response} minH={70} accent="emerald" />
          </>)}
        </CardContent>
      </Card>

      {/* Live preview */}
      {hasContent && (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <CardHeader className="px-3 sm:px-5 pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5 text-zinc-500">
              <EyeIcon className="size-3.5" />Previa do flashcard
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-5 pb-4 space-y-2">
            {cards.filter((c) => c.pergunta.trim()).map((c, i) => (
              <div key={i} className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2.5">
                <p className="text-sm font-medium">{c.pergunta}</p>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{c.resposta || <span className="italic text-zinc-300">resposta pendente...</span>}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Validation hint */}
      {!hasSelectedConcept && hasContent && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircleIcon className="size-4 flex-shrink-0" />
          Selecione ou crie um conceito para habilitar o salvamento.
        </div>
      )}

      {/* Save bar */}
      <Button onClick={handleSave} disabled={saving || !hasSelectedConcept || !hasContent || !hasAllAnswers} size="lg" className="w-full">
        {saving ? (<><Loader2Icon className="size-4 mr-1 animate-spin" /> Salvando...</>) : (() => {
          const parts: string[] = [];
          if (pendingTopics.length > 0) parts.push(`${pendingTopics.length} tp.`);
          if (pendingConcepts.length > 0) parts.push(`${pendingConcepts.length} conc.`);
          const cardCount = buildCardData().filter((c) => c.pergunta.trim() && c.resposta.trim()).length;
          if (parts.length > 0) {
            return (<><CheckCircle2Icon className="size-4 mr-1" /> Criar {cardCount} flashcard(s) e {parts.join(", ")}</>);
          }
          return (<><CheckCircle2Icon className="size-4 mr-1" /> Criar {cardCount} flashcard(s)</>);
        })()}
      </Button>
    </div>
  );
}

// ==========================================
// Small reusable form components
// ==========================================

function FormTextArea({ label, value, onChange, placeholder, error, minH, accent }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  minH: number;
  accent?: "red" | "emerald";
}) {
  const borderClass = error
    ? "border-red-300 dark:border-red-800 focus:ring-red-400"
    : accent === "red"
      ? "border-red-200 dark:border-red-800"
      : accent === "emerald"
        ? "border-emerald-200 dark:border-emerald-800"
        : "border-zinc-200 dark:border-zinc-700";

  return (
    <FormField label={label} error={error}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full rounded-md border ${borderClass} bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none placeholder:text-zinc-400`}
        style={{ minHeight: `${minH}px` }} />
    </FormField>
  );
}

function FormField({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={`text-sm font-medium ${error ? "text-red-500" : ""}`}>{label} {error && <span className="text-[10px] text-red-400">(obrigatoria)</span>}</Label>
      {children}
    </div>
  );
}

// ==========================================
// Page
// ==========================================

export default function NewFlashcardPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("from-nota");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Novo Flashcard</h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {mode === "from-nota" ? "Gere a partir de nota existente." : "Crie manualmente."}
          </p>
        </div>
        <button onClick={() => router.back()} className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 flex-shrink-0">
          <ChevronLeftIcon className="size-3" />Voltar
        </button>
      </div>
      <Separator />

      {/* Mode toggle */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
        <button type="button" onClick={() => setMode("from-nota")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "from-nota" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <SparklesIcon className="size-4" /> Via Nota
        </button>
        <button type="button" onClick={() => setMode("manual")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "manual" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <BrainIcon className="size-4" /> Manual
        </button>
      </div>

      {/* Content */}
      {mode === "from-nota" ? <FromNotaMode router={router} /> : <ManualModeContent router={router} />}
    </div>
  );
}
