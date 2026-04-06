"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2Icon, CheckCircle2Icon, ChevronDownIcon,
  ChevronRightIcon, BrainIcon, XIcon, PlusIcon,
  SparklesIcon, ArrowRightIcon, FileTextIcon,
  FlaskConicalIcon, PlusCircleIcon, LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getNotas,
} from "@/actions/notes";
import {
  getHierarquiaConceitos,
  createFullConcept,
  createTopico,
  createAssunto,
  type ConceitoArvore,
} from "@/actions/settings";
import {
  createFlashcard,
  previewFlashcardsFromNota,
  generateFlashcardsViaIA,
  saveFlashcardPreviewsFromNota,
  type FlashcardSourceType,
} from "@/actions/flashcard";

type PageMode = "from-nota" | "manual";
type AnalysisMode = "content" | "ia";

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
// "From Nota" mode with preview
// ==========================================

function FromNotaMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [notas, setNotas] = useState<Array<{ id: string; preview: string; dataCriacao: Date; conceitosRelacionados: { nome: string; id: string }[]; flashcardCount: number }>>([]);
  const [loadingNotas, setLoadingNotas] = useState(true);

  // Preview state
  const [selectedNotaId, setSelectedNotaId] = useState<string | null>(null);
  const [selectedNotaName, setSelectedNotaName] = useState("");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("content");
  const [previewCards, setPreviewCards] = useState<FlashcardPreview[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [doneCount, setDoneCount] = useState(0);

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
  };

  if (doneCount > 0) {
    return (
      <div className="space-y-6">
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10">
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2Icon className="size-10 mx-auto text-emerald-500" />
            <p className="text-lg font-medium">{doneCount} flashcard(s) criado(s)!</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => router.push("/flashcards")}>Ver flashcards</Button>
              <Button onClick={() => { setDoneCount(0); handleBackToNotes(); }}>Gerar mais</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingPreview) {
    return (
      <div className="space-y-6">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-16 text-center space-y-4">
            <Loader2Icon className="size-10 animate-spin text-zinc-400 mx-auto" />
            <p className="text-lg font-medium">
              {analysisMode === "ia" ? "Gerando flashcards com IA..." : "Extraindo flashcards da nota..."}
            </p>
            <p className="text-sm text-zinc-400">
              {analysisMode === "ia" ? "Analisando conteudo e criando tipos variados" : "Identificando definicoes e conceitos"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (previewCards.length > 0) {
    // Group cards by source type
    const grouped = new Map<string, FlashcardPreview[]>();
    for (const card of previewCards) {
      const group = grouped.get(card.source) || [];
      group.push(card);
      grouped.set(card.source, group);
    }

    const selectedCount = Array.from(selectedCards).filter((id) =>
      previewCards.some((c) => c.id === id)
    ).length;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{previewCards.length} flashcard(s)</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Da nota: {selectedNotaName} &middot; {analysisMode === "ia" ? "Análise IA" : "Análise de conteúdo"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedCards(new Set(previewCards.map((c) => c.id)))}>
              Todas
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSelectedCards(new Set())}>
              Nenhuma
            </Button>
          </div>
        </div>
        <Separator />

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
                    if (allSelected) {
                      cardIds.forEach((id) => next.delete(id));
                    } else {
                      cardIds.forEach((id) => next.add(id));
                    }
                    return next;
                  });
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${allSelected ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label} ({cards.length})</span>
              </button>
            );
          })}
        </div>

        {/* Preview cards grouped by type */}
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([source, cards]) => {
            const cfg = SOURCE_CONFIG[source as FlashcardSourceType] || SOURCE_CONFIG.conteudo;
            return (
              <div key={source}>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{cfg.icon}</span>
                  {cfg.label}
                  <span className="text-[10px] font-normal text-zinc-500">— {cfg.description}</span>
                </h3>
                <div className="space-y-2">
                  {cards.map((fc) => {
                    const isSelected = selectedCards.has(fc.id);
                    return (
                      <Card key={fc.id} className={`transition-all border-zinc-200 dark:border-zinc-800 ${isSelected ? "border-primary/20 bg-primary/[0.015]" : "opacity-50"}`}>
                        <button type="button" onClick={() => toggleCard(fc.id)} className="w-full text-left">
                          <CardContent className="pt-4 px-3 sm:px-6">
                            <div className="flex items-start gap-2">
                              <div className={`mt-0.5 size-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                                {isSelected && <CheckCircle2Icon className="size-3" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{fc.pergunta}</p>
                                  {(() => {
                                    const cfg = SOURCE_CONFIG[fc.source] || SOURCE_CONFIG.conteudo;
                                    return (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 h-5 flex-shrink-0">
                                        {cfg.icon} {cfg.label}
                                      </Badge>
                                    );
                                  })()}
                                </div>
                                <p className="text-xs text-zinc-400 mt-1 leading-relaxed whitespace-pre-line line-clamp-3">{fc.resposta}</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {fc.conceptNome && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5">{fc.conceptNome}</Badge>
                                  )}
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

        <Separator />

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

  // Default: select a nota
  return (
    <div className="space-y-6">
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Selecione uma nota</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Escolha uma nota e o modo de análise. Você poderá revisar os flashcards antes de salvar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6">
          {loadingNotas ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400 py-8"><Loader2Icon className="size-4 animate-spin" /> Carregando notas...</div>
          ) : notas.length === 0 ? (
            <div className="text-center py-8">
              <FileTextIcon className="size-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500">Nenhuma nota disponivel.</p>
              <Button variant="link" className="text-xs mt-1" onClick={() => router.push("/notes/new")}>Criar nota</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {notas.map((nota) => (
                <Card key={nota.id} className="border-zinc-200 dark:border-zinc-800 hover:border-primary/30 transition-colors">
                  <CardContent className="py-3 px-3 sm:px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium line-clamp-1">
                          {nota.preview.split("\n")[0].replace(/^#+\s*/, "") || "Sem titulo"}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{nota.preview}</p>
                        {nota.conceitosRelacionados.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {nota.conceitosRelacionados.slice(0, 3).map((c) => (
                              <Badge key={c.id} variant="outline" className="text-[10px] h-4 px-1">{c.nome}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {nota.flashcardCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] flex-shrink-0">{nota.flashcardCount} FC</Badge>
                      )}
                    </div>
                    {/* Generation buttons */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => handleGeneratePreview(nota.id, "content")}
                      >
                        <FlaskConicalIcon className="size-3.5 mr-1.5" />
                        Análise de conteúdo
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handleGeneratePreview(nota.id, "ia")}
                      >
                        <SparklesIcon className="size-3.5 mr-1.5" />
                        Com IA
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ==========================================
// Manual mode — with type selector
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
  { value: "pergunta_resposta", label: "Pergunta → Resposta", icon: "🧠", description: "Pergunta direta com resposta" },
  { value: "cloze", label: "Cloze", icon: "🔁", description: "Preenchimento de lacuna" },
  { value: "bidirecional", label: "Bidirecional", icon: "🔄", description: "Ida e volta" },
  { value: "explicacao_profunda", label: "Explicação Profunda", icon: "🧩", description: "Compreensão detalhada" },
  { value: "comparacao", label: "Comparação", icon: "⚖️", description: "Diferenças entre conceitos" },
  { value: "lista_fragmentada", label: "Lista Fragmentada", icon: "📊", description: "Pontos-chave (max 3-4)" },
  { value: "aplicacao_problema", label: "Aplicação / Problema", icon: "🔮", description: "Cenário de raciocínio" },
  { value: "erro_comum", label: "Erro Comum", icon: "⚠️", description: "Pegadinha frequente" },
];

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

  // Concept tree
  const [arvore, setArvore] = useState<ConceitoArvore[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(true);
  const [selectedConceptId, setSelectedConceptId] = useState("");
  const [expandedAssuntos, setExpandedAssuntos] = useState<Set<string>>(new Set());
  const [expandedRelAssuntos, setExpandedRelAssuntos] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedRelTopicos, setExpandedRelTopicos] = useState<Set<string>>(new Set());
  const [conceptMap, setConceptMap] = useState<Map<string, { nome: string; topicoNome: string; assuntoNome: string }>>(new Map());

  // --- New concept creation ---
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

  useEffect(() => {
    setLoadingConcepts(true);
    getHierarquiaConceitos().then((tree) => {
      setArvore(tree);
      const cMap = new Map<string, { nome: string; topicoNome: string; assuntoNome: string }>();
      for (const ass of tree) {
        for (const relAT of ass.relAssuntoTopico) {
          for (const top of relAT.topicos) {
            for (const relTC of top.relacoesTopicoConceito) {
              for (const conc of relTC.conceitos) {
                cMap.set(conc.id, { nome: conc.nome, topicoNome: top.nome, assuntoNome: ass.nome });
              }
            }
          }
        }
      }
      setConceptMap(cMap);
      setLoadingConcepts(false);
    }).catch(() => { setLoadingConcepts(false); });
  }, []);

  const toggleAssunto = (id: string) => setExpandedAssuntos((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleRelAssunto = (id: string) => setExpandedRelAssuntos((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleTopico = (id: string) => setExpandedTopics((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleRelTopico = (id: string) => setExpandedRelTopicos((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const setItem = (i: number, v: string) => setItens((p) => { const n = [...p]; n[i] = v; return n; });

  // --- Concept creation helpers ---
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
    const relsToTopics = selectedExistingTopics.map((s) => ({ targetTopicoId: s.id, tipoRelacao: s.tipoRelacao }));
    setPendingConcepts((p) => [...p, {
      tempId: `pc-${Date.now()}-${getNextTempId()}`,
      nome: newConceitoNome.trim(),
      relsToTopics,
      relsToPendingTopics: [],
    }]);
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
    setPendingConcepts((p) => [...p, {
      tempId: `pc-${Date.now()}-${getNextTempId()}`,
      nome: newConceitoNome.trim(),
      relsToTopics: [],
      relsToPendingTopics: [{ tempTopicoId: ptId, tipoRelacao: "FUNDAMENTA" }],
    }]);
    setNewConceitoNome("");
    setNewTopicName("");
    setNewTopicSelectedAssuntos([]);
  };

  const addPendingAssunto = () => {
    if (!newAssuntoNome.trim()) return;
    setPendingAssuntos((prev) => [...prev, {
      tempId: `pa-${Date.now()}-${getNextTempId()}`,
      nome: newAssuntoNome.trim(),
    }]);
    setNewAssuntoNome("");
  };

  const removePendingAssunto = (tempId: string) => {
    setPendingAssuntos((prev) => prev.filter((a) => a.tempId !== tempId));
  };

  const removePendingConcept = (tempId: string) => {
    setPendingConcepts((p) => p.filter((c) => c.tempId !== tempId));
  };

  const selectPendingConcept = (tempId: string) => {
    setSelectedConceptId(`pending:${tempId}`);
  };

  const buildCardData = (): Array<{ pergunta: string; resposta: string; conceitoId: string }> => {
    if (!selectedConceptId) return [];
    switch (tipo) {
      case "pergunta_resposta":
        return [{ pergunta: pergunta.trim(), resposta: resposta.trim(), conceitoId: selectedConceptId }];
      case "cloze":
        return [{ pergunta: `Complete: ${frase}`, resposta: lacuna, conceitoId: selectedConceptId }];
      case "bidirecional":
        return [
          { pergunta: perguntaIda.trim(), resposta: respostaIda.trim(), conceitoId: selectedConceptId },
          { pergunta: perguntaVolta.trim(), resposta: respostaVolta.trim(), conceitoId: selectedConceptId },
        ];
      case "explicacao_profunda":
        return [{ pergunta: pergunta.trim(), resposta: resposta.trim(), conceitoId: selectedConceptId }];
      case "comparacao":
        return [{ pergunta: `Qual a diferenca entre ${conceitoA} e ${conceitoB}?`, resposta: explicacaoComp, conceitoId: selectedConceptId }];
      case "lista_fragmentada":
        return [{ pergunta: `Cite os pontos principais sobre ${temaLista}`, resposta: itens.filter(Boolean).map((v, i) => `${i + 1}. ${v}`).join("\n"), conceitoId: selectedConceptId }];
      case "aplicacao_problema":
        return [{ pergunta: cenario, resposta: explicacaoApp, conceitoId: selectedConceptId }];
      case "erro_comum":
        return [{ pergunta: `Qual o erro comum sobre ${temaErro}?`, resposta: `ERRO: ${erro}\n\nCORRETO: ${correto}`, conceitoId: selectedConceptId }];
    }
  };

  const handleSave = async () => {
    // Resolve concept: either existing ID or pending
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
        if (pc.relsToTopics.length > 0) {
          firstTopicoId = pc.relsToTopics[0].targetTopicoId;
        }
        if (!firstTopicoId && pc.relsToPendingTopics.length > 0) {
          firstTopicoId = topicIdMap.get(pc.relsToPendingTopics[0].tempTopicoId);
        }
        if (!firstTopicoId && arvore.length > 0) {
          const a0 = arvore[0];
          for (const rel of a0.relAssuntoTopico) {
            if (rel.topicos.length > 0) { firstTopicoId = rel.topicos[0].id; break; }
          }
        }
        if (firstTopicoId) {
          let foundAssuntoId = "";
          for (const a of arvore) {
            for (const rel of a.relAssuntoTopico) {
              const found = rel.topicos.find((tp) => tp.id === firstTopicoId);
              if (found) { foundAssuntoId = a.id; break; }
            }
            if (foundAssuntoId) break;
          }
          if (!foundAssuntoId) {
            for (const pt of pendingTopics) {
              const cid = topicIdMap.get(pt.tempId);
              if (cid === firstTopicoId && pt.relsToAssuntos.length > 0) {
                const r = pt.relsToAssuntos[0];
                foundAssuntoId = assuntoIdMap.get(r.targetAssuntoId) ?? r.targetAssuntoId;
                break;
              }
            }
          }
          if (!foundAssuntoId && arvore.length > 0) foundAssuntoId = arvore[0].id;

          const created = await createFullConcept({
            nome: pc.nome,
            assuntoId: foundAssuntoId,
            topicoId: firstTopicoId,
          });
          conceptMap.set(created.id, { nome: created.nome, topicoNome: "", assuntoNome: "" });
          effectiveConceptId = created.id;
        }
      }
    }

    const conceitoFinal = effectiveConceptId;
    if (!conceitoFinal) { toast.error("Selecione ou adicione um conceito."); return; }

    const cards = buildCardData();
    if (cards.length === 0 || !cards[0].pergunta.trim()) { toast.error("Preencha os campos."); return; }
    if (cards.some((c) => !c.resposta.trim())) { toast.error("Preencha todas as respostas."); return; }

    setSaving(true);
    try {
      for (const card of cards) {
        await createFlashcard({ ...card, conceitoId: conceitoFinal });
      }
      toast.success(`${cards.length} flashcard(s) criado(s)!`);
      router.push("/flashcards");
    } catch {
      toast.error("Erro ao criar flashcard(s).");
    } finally {
      setSaving(false);
    }
  };

  const typeLabel = () => MANUAL_TYPES.find((t) => t.value === tipo)!;

  const ConceptSelector = () => loadingConcepts ? (
    <div className="flex items-center gap-2 text-sm text-zinc-400 py-4"><Loader2Icon className="size-4 animate-spin" /> Carregando...</div>
  ) : (
    <>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 mb-4">
        {arvore.map((assunto) => {
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
                                                    <button key={conceito.id} type="button" className={`w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 ${isSelected ? "bg-primary/[0.04]" : ""}`} onClick={() => setSelectedConceptId(conceito.id)}>
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
      {selectedConceptId && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Conceito vinculado: {conceptMap.get(selectedConceptId)?.nome}
        </p>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Tipo de flashcard</CardTitle>
          <CardDescription className="text-xs">Escolha o formato do flashcard manual.</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MANUAL_TYPES.map((t) => {
              const isSel = tipo === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`rounded-lg border p-2 text-left transition-all ${isSel ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"}`}
                >
                  <div className="text-base">{t.icon}</div>
                  <div className={`text-xs font-medium mt-1 ${isSel ? "text-foreground" : "text-zinc-500"}`}>{t.label}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contextual form */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <span>{typeLabel().icon}</span> {typeLabel().label}
          </CardTitle>
          <CardDescription className="text-xs">{typeLabel().description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          {tipo === "pergunta_resposta" && (<>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pergunta</label>
              <textarea value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex: O que e o principio da legalidade?" className="w-full min-h-[80px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resposta</label>
              <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Ex: E o principio segundo o qual..." className="w-full min-h-[100px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
          </>)}

          {tipo === "cloze" && (<>
            <div className="space-y-2">
              <label className="text-sm font-medium">Frase com lacuna</label>
              <input value={frase} onChange={(e) => setFrase(e.target.value)} placeholder="Ex: A mitocôndria produz {lacuna}." className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Palavra da lacuna</label>
              <input value={lacuna} onChange={(e) => setLacuna(e.target.value)} placeholder="Ex: ATP" className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
            </div>
          </>)}

          {tipo === "bidirecional" && (<>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><ArrowRightIcon className="size-3.5" /> Pergunta (ida)</label>
              <textarea value={perguntaIda} onChange={(e) => setPerguntaIda(e.target.value)} placeholder="Ex: O que e ATP?" className="w-full min-h-[80px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resposta</label>
              <textarea value={respostaIda} onChange={(e) => setRespostaIda(e.target.value)} placeholder="Molecula de energia celular..." className="w-full min-h-[80px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
            <Separator />
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><ArrowRightIcon className="size-3.5 rotate-180" /> Pergunta (volta)</label>
              <textarea value={perguntaVolta} onChange={(e) => setPerguntaVolta(e.target.value)} placeholder="Ex: Qual molecula responsavel pela energia celular?" className="w-full min-h-[80px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resposta</label>
              <textarea value={respostaVolta} onChange={(e) => setRespostaVolta(e.target.value)} placeholder="ATP (Adenosina Trifosfato)..." className="w-full min-h-[80px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
          </>)}

          {tipo === "explicacao_profunda" && (<>
            <div className="space-y-2">
              <label className="text-sm font-medium">Pergunta / Topico</label>
              <textarea value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex: Como funciona a fotossíntese?" className="w-full min-h-[80px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Explicação (etapas)</label>
              <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder={"1. A luz solar e absorvida...\n2. A água e decomposta...\n3. O CO2 e transformado..."} className="w-full min-h-[150px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
          </>)}

          {tipo === "comparacao" && (<>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Conceito A</label>
                <input value={conceitoA} onChange={(e) => setConceitoA(e.target.value)} placeholder="Ex: Celula procarionte" className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Conceito B</label>
                <input value={conceitoB} onChange={(e) => setConceitoB(e.target.value)} placeholder="Ex: Celula eucarionte" className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Explicação / Comparativo</label>
              <textarea value={explicacaoComp} onChange={(e) => setExplicacaoComp(e.target.value)} placeholder="- Procarionte: sem nucleo...\n- Eucarionte: com nucleo..." className="w-full min-h-[120px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
          </>)}

          {tipo === "lista_fragmentada" && (<>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tema</label>
              <input value={temaLista} onChange={(e) => setTemaLista(e.target.value)} placeholder="Ex: Funcoes do figado" className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Itens (max 4)</label>
              {itens.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 w-5">{i + 1}.</span>
                  <input value={item} onChange={(e) => setItem(i, e.target.value)} placeholder={`Item ${i + 1}`} className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
                  {item && <XIcon className="size-3.5 text-zinc-300 cursor-pointer" onClick={() => setItem(i, "")} />}
                </div>
              ))}
              {itens.length < 4 && (
                <button type="button" onClick={() => setItens((p) => [...p, ""])} className="text-xs text-primary hover:underline flex items-center gap-1"><PlusIcon className="size-3" />Adicionar item</button>
              )}
            </div>
          </>)}

          {tipo === "aplicacao_problema" && (<>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cenário / Problema</label>
              <textarea value={cenario} onChange={(e) => setCenario(e.target.value)} placeholder={"Ex: Um paciente apresenta sintomas de deficiencia nutricional..."} className="w-full min-h-[100px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Explicação / Solução</label>
              <textarea value={explicacaoApp} onChange={(e) => setExplicacaoApp(e.target.value)} placeholder="A deficiencia de vitaminas do complexo B pode comprometer..." className="w-full min-h-[120px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-zinc-400" />
            </div>
          </>)}

          {tipo === "erro_comum" && (<>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tema</label>
              <input value={temaErro} onChange={(e) => setTemaErro(e.target.value)} placeholder="Ex: Fotossíntese" className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-zinc-400" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-red-500">Erro comum</label>
              <textarea value={erro} onChange={(e) => setErro(e.target.value)} placeholder="Muitos acham que..." className="w-full min-h-[80px] rounded-md border border-red-200 dark:border-red-800 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none placeholder:text-zinc-400" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Explicação correta</label>
              <textarea value={correto} onChange={(e) => setCorreto(e.target.value)} placeholder="Na verdade, o correto e..." className="w-full min-h-[80px] rounded-md border border-emerald-200 dark:border-emerald-800 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none placeholder:text-zinc-400" />
            </div>
          </>)}
        </CardContent>
      </Card>

      {/* Concept selection */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Conceito</CardTitle>
          <CardDescription className="text-xs">Selecione o conceito do flashcard ou crie um novo abaixo.</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <ConceptSelector />
        </CardContent>
      </Card>

      {/* ==========================================
          NOVO CONCEITO — relation-based form
      ========================================== */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2"><PlusCircleIcon className="size-4" />Novo Conceito</CardTitle>
          <CardDescription className="text-xs">Crie um conceito vinculado a um topico existente ou novo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          {/* Concept name */}
          <div className="space-y-2">
            <Label>Nome do conceito</Label>
            <Input value={newConceitoNome} onChange={(e) => setNewConceitoNome(e.target.value)} placeholder="Ex: Principio da Legalidade" className="h-9" />
          </div>

          {/* Toggle: existing vs new topic */}
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
              <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
                {allExistingTopicos.map((topico) => {
                  const sel = selectedExistingTopics.find((s) => s.id === topico.id);
                  const isChecked = !!sel;
                  return (
                    <div key={topico.id} className="flex items-center gap-2 py-1 px-2">
                      <button type="button" onClick={() => toggleExistingTopicSelect(topico.id, "FUNDAMENTA")} className="flex-shrink-0">
                        <div className={`size-3.5 rounded border flex items-center justify-center ${isChecked ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                          {isChecked && <CheckCircle2Icon className="size-3 text-white" />}
                        </div>
                      </button>
                      <span className={`text-xs flex-1 truncate ${isChecked ? "font-medium text-zinc-700 dark:text-zinc-300" : "text-zinc-500"}`}>
                        {topico.nome} <span className="text-[10px] text-zinc-400">({topico.assuntoNome})</span>
                      </span>
                      {isChecked && (
                        <select value={sel.tipoRelacao} onChange={(e) => updateExistingTopicRelType(topico.id, e.target.value)}
                          className="h-7 px-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-shrink-0">
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
                  <span className="text-[10px] text-zinc-400">{selectedExistingTopics.length} topico(s) selecionado(s)</span>
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
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-zinc-400">Vincular a materias</Label>
                  {newTopicSelectedAssuntos.length > 0 && (
                    <span className="text-[10px] text-emerald-500 font-medium">{newTopicSelectedAssuntos.length} materia(s)</span>
                  )}
                </div>
                <div className="max-h-36 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
                  {arvore.map((a) => {
                    const sel = newTopicSelectedAssuntos.find((s) => s.id === a.id);
                    const isChecked = !!sel;
                    return (
                      <div key={a.id} className="flex items-center gap-2 py-1 px-2">
                        <button type="button" onClick={() => {
                          if (isChecked) {
                            setNewTopicSelectedAssuntos((prev) => prev.filter((x) => x.id !== a.id));
                          } else {
                            setNewTopicSelectedAssuntos((prev) => [...prev, { id: a.id, nome: a.nome, tipoRelacao: "PERTENCE_A" }]);
                          }
                        }} className="flex-shrink-0">
                          <div className={`size-3.5 rounded border flex items-center justify-center ${isChecked ? "bg-primary/10 border-primary text-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                            {isChecked && <CheckCircle2Icon className="size-3" />}
                          </div>
                        </button>
                        <span className={`text-xs flex-1 ${isChecked ? "font-medium" : "text-zinc-500"}`}>{a.nome}</span>
                        {isChecked && (
                          <select value={sel.tipoRelacao} onChange={(e) => updateAssuntoRelType(a.id, e.target.value)}
                            className="h-7 px-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-shrink-0">
                            <option value="PERTENCE_A">PERTENCE_A</option>
                            <option value="APLICADO_EM">APLICADO_EM</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                  {/* Pending assuntos */}
                  {pendingAssuntos.map((pa) => {
                    const sel = newTopicSelectedAssuntos.find((s) => s.id === pa.tempId);
                    const isChecked = !!sel;
                    return (
                      <div key={pa.tempId} className="flex items-center gap-2 py-1 px-2">
                        <button type="button" onClick={() => {
                          if (isChecked) {
                            setNewTopicSelectedAssuntos((prev) => prev.filter((x) => x.id !== pa.tempId));
                          } else {
                            setNewTopicSelectedAssuntos((prev) => [...prev, { id: pa.tempId, nome: pa.nome, tipoRelacao: "PERTENCE_A" }]);
                          }
                        }} className="flex-shrink-0">
                          <div className={`size-3.5 rounded border flex items-center justify-center ${isChecked ? "bg-emerald-100 border-emerald-400 text-emerald-600" : "border-zinc-300 dark:border-zinc-600"}`}>
                            {isChecked && <CheckCircle2Icon className="size-3" />}
                          </div>
                        </button>
                        <span className="text-xs flex-1">{pa.nome}</span>
                        <Badge variant="outline" className="text-[8px] h-3.5 px-0.5 text-emerald-500 border-emerald-300 flex-shrink-0">nova</Badge>
                        {isChecked && (
                          <select value={sel.tipoRelacao} onChange={(e) => updateAssuntoRelType(pa.tempId, e.target.value)}
                            className="h-7 px-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-shrink-0">
                            <option value="PERTENCE_A">PERTENCE_A</option>
                            <option value="APLICADO_EM">APLICADO_EM</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  <button type="button" onClick={() => {
                    const allIds = [...arvore.map((a) => a.id), ...pendingAssuntos.map((p) => p.tempId)];
                    const allSelected = allIds.every((id) => newTopicSelectedAssuntos.some((s) => s.id === id));
                    if (allSelected) setNewTopicSelectedAssuntos([]);
                    else setNewTopicSelectedAssuntos([...arvore.map((a) => ({ id: a.id, nome: a.nome, tipoRelacao: "PERTENCE_A" })), ...pendingAssuntos.map((p) => ({ id: p.tempId, nome: p.nome, tipoRelacao: "PERTENCE_A" }))]);
                  }} className="text-[10px] text-primary hover:underline">
                    {newTopicSelectedAssuntos.length > 0 ? "Desmarcar todas" : "Selecionar todas"}
                  </button>
                  {newTopicSelectedAssuntos.length > 0 && (
                    <button type="button" onClick={() => setNewTopicSelectedAssuntos([])} className="text-[10px] text-red-400 hover:text-red-500">Limpar</button>
                  )}
                </div>

                <div className="flex gap-2 items-end">
                  <Input value={newAssuntoNome} onChange={(e) => setNewAssuntoNome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newAssuntoNome.trim()) addPendingAssunto(); }} placeholder="Nova materia" className="h-8 flex-1" />
                  <Button type="button" onClick={addPendingAssunto} disabled={!newAssuntoNome.trim()} size="sm" className="h-8"><PlusIcon className="size-3 mr-1" />Materia</Button>
                </div>
              </div>

              <Button type="button" onClick={addNewTopicRelation} disabled={!newTopicName.trim() || newTopicSelectedAssuntos.length === 0 || !newConceitoNome.trim()} size="sm" className="w-full">
                <LinkIcon className="size-3 mr-1" />Adicionar conceito
              </Button>
            </div>
          )}

          {/* Queue summary */}
          {pendingConcepts.length > 0 && (
            <div className="space-y-1.5 pt-4 border-t">
              <p className="text-xs font-medium text-zinc-500">{pendingConcepts.length} conceito(s) na fila para criacao:</p>
              {pendingConcepts.map((pc) => (
                <div key={pc.tempId} className="flex items-start justify-between bg-zinc-50 dark:bg-zinc-900/50 rounded-md px-3 py-2 border border-zinc-200 dark:border-zinc-800">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{pc.nome}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pc.relsToTopics.map((r, ri) => (
                        <Badge key={ri} variant="outline" className="text-[10px] h-4 px-1">{r.tipoRelacao}: {getTopicoName(r.targetTopicoId)}</Badge>
                      ))}
                      {pc.relsToPendingTopics.map((r) => {
                        const pt = pendingTopics.find((t) => t.tempId === r.tempTopicoId);
                        const assuntoNames = pt?.relsToAssuntos.map(ra => getAssuntoName(ra.targetAssuntoId)) ?? [];
                        return (<Badge key={r.tempTopicoId} variant="secondary" className="text-[10px] h-4 px-1">topico "{pt?.nome}" → {assuntoNames.join(", ")}</Badge>);
                      })}
                    </div>
                  </div>
                  <button type="button" onClick={() => removePendingConcept(pc.tempId)} className="flex-shrink-0 text-zinc-400 hover:text-red-500 ml-2">
                    <XIcon className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
        {saving ? (<><Loader2Icon className="size-4 mr-1 animate-spin" /> Salvando...</>) : (() => {
          const parts: string[] = [];
          if (pendingTopics.length > 0) parts.push(`${pendingTopics.length} topico(s)`);
          if (pendingConcepts.length > 0) parts.push(`${pendingConcepts.length} conceito(s)`);
          if (parts.length > 0) {
            return (<><CheckCircle2Icon className="size-4 mr-1" /> Criar flashcard e {parts.join(", ")}</>);
          }
          return (<><CheckCircle2Icon className="size-4 mr-1" /> Criar flashcard{tipo === "bidirecional" ? " (2)" : ""}</>);
        })()}
      </Button>
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Novo Flashcard</h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {mode === "from-nota" ? "Gere flashcards a partir de uma nota existente." : "Crie manualmente com conceito."}
        </p>
      </div>
      <Separator />

      {/* Mode toggle */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
        <button
          onClick={() => setMode("from-nota")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "from-nota" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}
        >
          <SparklesIcon className="size-4" /> Via Nota
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "manual" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}
        >
          <BrainIcon className="size-4" /> Manual
        </button>
      </div>

      {/* Mode content */}
      {mode === "from-nota" ? <FromNotaMode router={router} /> : <ManualModeContent router={router} />}

      {/* Back */}
      <Button variant="ghost" className="w-full" onClick={() => router.push("/flashcards")}>
        Voltar para flashcards
      </Button>
    </div>
  );
}
