"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Loader2Icon, SparklesIcon, CheckCircle2Icon, ChevronDownIcon,
  ChevronRightIcon, BrainIcon, XIcon, PlusIcon, PlusCircleIcon,
  ArrowRightIcon, LinkIcon, SearchIcon, LayersIcon, BookOpenIcon,
  MessageSquareIcon, LightbulbIcon, GitMergeIcon, AlertTriangleIcon, ZapIcon,
  ArrowUpCircleIcon, FileScanIcon,
} from "lucide-react";
import { toast } from "sonner";
import { analyzeRawText, saveSelectedNotas, type NotaCandidata } from "@/lib/ai-api";
import { createNotaManual, type SubtipoNota } from "@/lib/notes-api";
import {
  getHierarquiaConceitos,
  createFullConcept,
  createTopico,
  createAssunto,
  type ConceitoArvore,
} from "@/lib/content-api";

type PageMode = "ia" | "manual";
type IAStep = "input" | "analyzing" | "review" | "saving";

// ==========================================
// Relation type constants
// ==========================================

const NOTA_TO_CONCEITO_TYPES = [
  { value: "DEFINE", label: "DEFINE" },
  { value: "EXPLICA", label: "EXPLICA" },
  { value: "APROFUNDA", label: "APROFUNDA" },
  { value: "EXEMPLIFICA", label: "EXEMPLIFICA" },
  { value: "CONTRASTA", label: "CONTRASTA" },
  { value: "SINTETIZA", label: "SINTETIZA" },
  { value: "ALERTA_ERRO", label: "ALERTA_ERRO" },
];

const CONCEITO_TO_CONCEITO_TYPES = [
  { value: "IS_A", label: "IS_A" },
  { value: "PART_OF", label: "PART_OF" },
  { value: "PREREQUISITO", label: "PREREQUISITO" },
  { value: "DERIVA_DE", label: "DERIVA_DE" },
  { value: "EVOLUI_PARA", label: "EVOLUI_PARA" },
  { value: "REFORCA", label: "REFORCA" },
  { value: "ALTERNATIVA_A", label: "ALTERNATIVA_A" },
  { value: "CONTRASTA_COM", label: "CONTRASTA_COM" },
  { value: "CONFUNDE_COM", label: "CONFUNDE_COM" },
  { value: "ANTI_PADRAO_DE", label: "ANTI_PADRAO_DE" },
  { value: "MEDIDO_POR", label: "MEDIDO_POR" },
  { value: "OBJETIVO_DE", label: "OBJETIVO_DE" },
];

const CONCEITO_TO_TOPICO_TYPES = [
  { value: "PERTENCE_A", label: "PERTENCE_A" },
  { value: "FUNDAMENTA", label: "FUNDAMENTA" },
  { value: "APLICADO_EM", label: "APLICADO_EM" },
];

// ==========================================
// Small reusable components
// ==========================================

function FormField({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={`text-sm font-medium ${error ? "text-red-500" : ""}`}>
        {label} {error && <span className="text-[10px] text-red-400">(obrigatorio)</span>}
      </Label>
      {children}
    </div>
  );
}

interface FlatConcept {
  id: string;
  nome: string;
  topicoNome: string;
  topicoId: string;
  assuntoNome: string;
  assuntoId: string;
}

// ==========================================
// IA Mode
// ==========================================

function IAModeContent({ router }: { router: ReturnType<typeof useRouter> }) {
  const [rawText, setRawText] = useState("");
  const [step, setStep] = useState<IAStep>("input");
  const [candidatas, setCandidatas] = useState<NotaCandidata[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const wordCount = useMemo(() => rawText.trim().split(/\s+/).filter(Boolean).length, [rawText]);

  const handleAnalyze = async () => {
    if (!rawText.trim()) { toast.error("Cole algum texto."); return; }
    setStep("analyzing");
    try {
      const { candidatas } = await analyzeRawText(rawText);
      if (candidatas.length === 0) { toast.error("Nenhuma nota extraida."); setStep("input"); return; }
      setCandidatas(candidatas);
      setSelected(new Set(candidatas.map((_, i) => i)));
      setStep("review");
      toast.success(`${candidatas.length} nota(s) extraida(s)!`);
    } catch (err) { console.error(err); toast.error("Erro ao analisar."); setStep("input"); }
  };

  const handleSave = async () => {
    const toSave = Array.from(selected).filter((i) => candidatas[i]).map((i) => ({
      titulo: candidatas[i].titulo,
      conteudo: candidatas[i].conteudo,
      conceitosPrevistos: candidatas[i].conceitosPrevistos,
    }));
    if (toSave.length === 0) { toast.error("Selecione ao menos uma nota."); return; }
    setStep("saving");
    try { const { notaIds } = await saveSelectedNotas(toSave); toast.success(`${notaIds.length} nota(s) salva(s)!`); router.push("/notes"); }
    catch (err) { console.error(err); toast.error("Erro ao salvar."); setStep("review"); }
  };

  const toggle = (i: number) => setSelected((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <div className="space-y-5">
      {step === "input" && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Texto bruto</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Cole conteudo. A IA vai separar em notas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-3 sm:px-6">
            <div className="space-y-1">
              <Textarea placeholder="Cole aqui o texto..." value={rawText} onChange={(e) => setRawText(e.target.value)} className="min-h-[250px] sm:min-h-[350px] font-mono text-xs sm:text-sm" rows={14} />
              {wordCount > 0 && <p className="text-[10px] text-zinc-400">{wordCount} palavras</p>}
            </div>
            <Button onClick={handleAnalyze} size="lg" className="w-full"><SparklesIcon className="size-4 mr-1" />Analisar com IA</Button>
          </CardContent>
        </Card>
      )}
      {step === "analyzing" && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-16 text-center space-y-4">
            <Loader2Icon className="size-10 animate-spin text-zinc-400 mx-auto" />
            <p className="text-lg font-medium">Analisando texto com IA...</p>
            <p className="text-sm text-zinc-400">Identificando notas e conceitos relacionados</p>
          </CardContent>
        </Card>
      )}
      {step === "review" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3">
            <div>
              <p className="text-sm font-medium">{candidatas.length} nota(s) extraida(s)</p>
              <p className="text-[10px] text-zinc-400">{selected.size} selecionada(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set(candidatas.map((_, i) => i)))}>Todas</Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Nenhuma</Button>
            </div>
          </div>

          <div className="space-y-2">
            {candidatas.map((c, idx) => {
              const hasConcepts = c.conceitosPrevistos.length > 0;
              const isExpanded = expandedCard === idx;
              return (
                <Card key={idx} className={`transition-all ${selected.has(idx) ? "border-primary/30 bg-primary/[0.02]" : "opacity-60"} border-zinc-200 dark:border-zinc-800`}>
                  <button onClick={() => toggle(idx)} className="w-full text-left">
                    <div className="px-3 sm:px-6 pt-3 pb-2">
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 size-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected.has(idx) ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>
                          {selected.has(idx) && <CheckCircle2Icon className="size-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium">{c.titulo}</h3>
                          <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1">{c.conteudo.slice(0, 100)}...</p>
                        </div>
                      </div>
                      {hasConcepts && (
                        <div className="flex flex-wrap gap-1 mt-2 ml-7">
                          {c.conceitosPrevistos.slice(0, 6).map((cn, ci) => (
                            <Badge key={ci} variant="outline" className="text-[10px] px-1.5 h-5">{cn}</Badge>
                          ))}
                          {c.conceitosPrevistos.length > 6 && (
                            <span className="text-[10px] text-zinc-400">+{c.conceitosPrevistos.length - 6}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="px-3 sm:px-6 pb-3">
                    <Button variant="ghost" size="sm" className="text-xs text-zinc-400 h-7 px-1" onClick={() => setExpandedCard(isExpanded ? null : idx)}>
                      {isExpanded ? <ChevronDownIcon className="size-3.5 mr-1" /> : <ChevronRightIcon className="size-3.5 mr-1" />}
                      {isExpanded ? "Ocultar" : "Ver conteudo"}
                    </Button>
                    {isExpanded && (
                      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 rounded-md p-3 border border-zinc-100 dark:border-zinc-800 max-h-[200px] overflow-y-auto">
                        {c.conteudo}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Separator />
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => setStep("input")} className="w-full sm:w-auto"><XIcon className="size-3.5 mr-1" />Voltar</Button>
            <Button onClick={handleSave} disabled={selected.size === 0} size="lg" className="w-full sm:w-auto">
              <CheckCircle2Icon className="size-4 mr-1" />Salvar {selected.size} nota(s)
            </Button>
          </div>
        </div>
      )}
      {step === "saving" && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="py-16 text-center space-y-4">
            <Loader2Icon className="size-10 animate-spin text-zinc-400 mx-auto" />
            <p className="text-lg font-medium">Salvando notas...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==========================================
// Subtipo config
// ==========================================

const SUBTIPO_CONFIG: Array<{
  value: SubtipoNota;
  label: string;
  icon: React.FC<{ className?: string }>;
  desc: string;
  template: string;
}> = [
  {
    value: "DEFINICAO", label: "Definição", icon: BookOpenIcon, desc: "O que é um conceito",
    template: "## Definição\n\n[Defina o conceito em uma frase clara e precisa]\n\n## Características\n\n- [Característica 1]\n- [Característica 2]\n\n## Por que é importante?\n\n[Explique a relevância]",
  },
  {
    value: "EXPLICACAO", label: "Explicação", icon: MessageSquareIcon, desc: "Como funciona, por que existe",
    template: "## Explicação\n\n[Explique o conceito com suas próprias palavras]\n\n## Como funciona?\n\n[Descreva o mecanismo ou processo]\n\n## Pontos-chave\n\n- [Ponto 1]\n- [Ponto 2]",
  },
  {
    value: "EXEMPLO", label: "Exemplo", icon: LightbulbIcon, desc: "Caso concreto que ilustra um conceito",
    template: "## Exemplo\n\n[Descreva o exemplo concreto]\n\n## Conceito ilustrado\n\n[Que conceito este exemplo ilustra?]\n\n## Por que funciona?\n\n[Explique a conexão com o conceito]",
  },
  {
    value: "COMPARACAO", label: "Comparação", icon: GitMergeIcon, desc: "Diferenças e semelhanças entre conceitos",
    template: "## Comparação: [Conceito A] vs [Conceito B]\n\n| Aspecto | [A] | [B] |\n|---------|-----|-----|\n| [Aspecto 1] | | |\n| [Aspecto 2] | | |\n\n## Quando usar cada um?\n\n[Descreva os contextos]",
  },
  {
    value: "SINTESE", label: "Síntese", icon: LayersIcon, desc: "Resumo integrado de um tema",
    template: "## Síntese: [Tema]\n\n### Ideia central\n\n[A ideia mais importante em uma frase]\n\n### Pontos principais\n\n1. [Ponto 1]\n2. [Ponto 2]\n3. [Ponto 3]\n\n### Conexões\n\n- [Como se conecta com outros conceitos?]",
  },
  {
    value: "PREREQUISITO", label: "Pré-requisito", icon: ArrowUpCircleIcon, desc: "Base necessária antes de avançar",
    template: "## Pré-requisito: [Conceito base]\n\n[Explique o conceito base]\n\n## Por que é necessário?\n\n[Por que este conhecimento é fundamental]\n\n## O que se torna possível?\n\n- [Conceito avançado 1]\n- [Conceito avançado 2]",
  },
  {
    value: "ERRO_COMUM", label: "Erro Comum", icon: AlertTriangleIcon, desc: "Confusão frequente e como evitar",
    template: "## Erro Comum: [Descreva o erro]\n\n### Por que acontece?\n\n[Explique a confusão ou mal-entendido]\n\n### O correto é:\n\n[Explique a forma correta]\n\n### Exemplo\n\n❌ Errado: [exemplo errado]\n✅ Correto: [exemplo correto]",
  },
  {
    value: "APLICACAO", label: "Aplicação", icon: ZapIcon, desc: "Como usar o conceito na prática",
    template: "## Aplicação: [Descreva o caso de uso]\n\n### Contexto\n\n[Em que situação isso é aplicado?]\n\n### Como aplicar?\n\n1. [Passo 1]\n2. [Passo 2]\n\n### Resultado esperado\n\n[O que se obtém com esta aplicação?]",
  },
];

// ==========================================
// Manual Mode
// ==========================================

interface NotaConceitoRel {
  conceitoId: string;
  tipoRelacao: string;
}

interface ConceitoConceitoRel {
  origemId: string;
  destinoId: string;
  tipoRelacao: string;
}

type StagedRelation = {
  kind: "existing-topic";
  topicId: string;
  topicNome: string;
  tipoRelacao: string;
} | {
  kind: "new-topic";
  topicTempId: string;
  topicNome: string;
  tipoRelacao: string;
  targetAssuntoIds: string[];
  targetAssuntoNomes: string[];
};

interface PendingConcept {
  tempId: string;
  nome: string;
  relsToTopics: Array<{ targetTopicoId: string; tipoRelacao: string }>;
  relsToPendingTopics: Array<{ tempTopicoId: string; tipoRelacao: string }>;
}

interface PendingTopic {
  nome: string;
  tempId: string;
  relsToAssuntos: Array<{ targetAssuntoId: string; tipoRelacao: string }>;
}

function ManualModeContent({ router }: { router: ReturnType<typeof useRouter> }) {
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [saving, setSaving] = useState(false);
  const [subtipo, setSubtipo] = useState<SubtipoNota | null>(null);

  const titleError = titulo.trim().length === 0 && conteudo.trim().length > 0;
  const contentError = conteudo.trim().length === 0 && titulo.trim().length > 0;
  const wordCount = useMemo(() => conteudo.trim().split(/\s+/).filter(Boolean).length, [conteudo]);

  const [conceptSearch, setConceptSearch] = useState("");
  const [showFlatList, setShowFlatList] = useState(false);

  const [arvore, setArvore] = useState<ConceitoArvore[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(true);

  const [expandedAssuntos, setExpandedAssuntos] = useState<Set<string>>(new Set());
  const [expandedRelAssuntos, setExpandedRelAssuntos] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [expandedRelTopicos, setExpandedRelTopicos] = useState<Set<string>>(new Set());

  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [conceptMap, setConceptMap] = useState<Map<string, { nome: string; topicoNome: string; assuntoNome: string }>>(new Map());
  const [flatConcepts, setFlatConcepts] = useState<FlatConcept[]>([]);

  const [notaConceitoRels, setNotaConceitoRels] = useState<NotaConceitoRel[]>([]);
  const [conceitoConceitoRels, setConceitoConceitoRels] = useState<ConceitoConceitoRel[]>([]);
  const [pendingAssuntos, setPendingAssuntos] = useState<Array<{ tempId: string; nome: string }>>([]);
  const [pendingTopics, setPendingTopics] = useState<PendingTopic[]>([]);
  const [pendingConcepts, setPendingConcepts] = useState<PendingConcept[]>([]);

  const [newConceitoNome, setNewConceitoNome] = useState("");
  const [relationMode, setRelationMode] = useState<"existing" | "new">("existing");
  const [stagedRelations, setStagedRelations] = useState<StagedRelation[]>([]);
  const [selectedExistingTopics, setSelectedExistingTopics] = useState<Array<{ id: string; tipoRelacao: string }>>([]);
  const [newTopicNome, setNewTopicNome] = useState("");
  const [newTopicSelectedAssuntos, setNewTopicSelectedAssuntos] = useState<Array<{ id: string; nome: string; tipoRelacao: string }>>([]);
  const [newAssuntoNome, setNewAssuntoNome] = useState("");
  const [nextIdCounter, setNextIdCounter] = useState(0);

  const getNextId = () => { setNextIdCounter((p) => p + 1); return nextIdCounter + 1; };

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
    }).catch(() => setLoadingConcepts(false));
  }, []);

  const filteredFlat = useMemo(() => {
    if (!conceptSearch) return flatConcepts;
    const l = conceptSearch.toLowerCase();
    return flatConcepts.filter((c) =>
      c.nome.toLowerCase().includes(l) || c.topicoNome.toLowerCase().includes(l) || c.assuntoNome.toLowerCase().includes(l)
    );
  }, [flatConcepts, conceptSearch]);

  const getTopicosForAssunto = (assuntoId: string) => {
    const seen = new Map<string, string>();
    const ass = arvore.find((a) => a.id === assuntoId);
    if (!ass) return [];
    for (const rel of ass.relAssuntoTopico) for (const tp of rel.topicos) if (!seen.has(tp.id)) seen.set(tp.id, tp.nome);
    return Array.from(seen.entries()).map(([id, nome]) => ({ id, nome }));
  };

  const getAssuntoName = (id: string) => {
    const real = arvore.find((a) => a.id === id);
    if (real) return real.nome;
    return pendingAssuntos.find((a) => a.tempId === id)?.nome || "";
  };

  const getTopicName = (id: string) => {
    for (const a of arvore) for (const rel of a.relAssuntoTopico) { const f = rel.topicos.find((t) => t.id === id); if (f) return f.nome; }
    return pendingTopics.find((t) => t.tempId === id)?.nome || id;
  };

  const existingTopicosByAssunto = useMemo(() =>
    arvore.map((a) => ({ assuntoId: a.id, assuntoNome: a.nome, topicos: getTopicosForAssunto(a.id) })).filter((g) => g.topicos.length > 0),
  [arvore]);

  const addExistingTopicRelation = () => {
    if (selectedExistingTopics.length === 0) return;
    const newRels: StagedRelation[] = selectedExistingTopics.map((item) => ({
      kind: "existing-topic" as const, topicId: item.id, topicNome: getTopicName(item.id), tipoRelacao: item.tipoRelacao,
    }));
    setStagedRelations((prev) => [...prev, ...newRels]);
    setSelectedExistingTopics([]);
  };

  const addNewTopicRelation = () => {
    if (!newTopicNome.trim() || newTopicSelectedAssuntos.length === 0) return;
    const tempId = `pt-${Date.now()}-${getNextId()}`;
    setStagedRelations((prev) => [...prev, {
      kind: "new-topic", topicTempId: tempId, topicNome: newTopicNome.trim(),
      tipoRelacao: newTopicSelectedAssuntos.map((a) => a.tipoRelacao).join(", "),
      targetAssuntoIds: newTopicSelectedAssuntos.map((a) => a.id),
      targetAssuntoNomes: newTopicSelectedAssuntos.map((a) => a.nome),
    }]);
    setNewTopicNome("");
    setNewTopicSelectedAssuntos([]);
  };

  const updateAssuntoRelType = (id: string, tipo: string) => {
    setNewTopicSelectedAssuntos((prev) => prev.map((item) => item.id === id ? { ...item, tipoRelacao: tipo } : item));
  };

  const updateExistingTopicRelType = (id: string, tipo: string) => {
    setSelectedExistingTopics((prev) => prev.map((item) => item.id === id ? { ...item, tipoRelacao: tipo } : item));
  };

  const toggleExistingTopicSelect = (tid: string, defaultType: string) => {
    setSelectedExistingTopics((prev) =>
      prev.some((item) => item.id === tid) ? prev.filter((item) => item.id !== tid) : [...prev, { id: tid, tipoRelacao: defaultType }]
    );
  };

  const removeStagedRelation = (idx: number) => setStagedRelations((prev) => prev.filter((_, i) => i !== idx));

  const addConceptToQueue = () => {
    if (!newConceitoNome.trim() || stagedRelations.length === 0) return;
    const relsToTopics = stagedRelations.filter((r): r is Extract<StagedRelation, { kind: "existing-topic" }> => r.kind === "existing-topic").map((r) => ({ targetTopicoId: r.topicId, tipoRelacao: r.tipoRelacao }));
    const relsToPendingTopics = stagedRelations.filter((r): r is Extract<StagedRelation, { kind: "new-topic" }> => r.kind === "new-topic").map((r) => ({ tempTopicoId: r.topicTempId, tipoRelacao: r.tipoRelacao }));
    const newTopicMap = new Map<string, PendingTopic>();
    for (const r of stagedRelations) {
      if (r.kind === "new-topic" && !newTopicMap.has(r.topicTempId)) {
        newTopicMap.set(r.topicTempId, {
          tempId: r.topicTempId, nome: r.topicNome,
          relsToAssuntos: r.targetAssuntoIds.map((aid) => ({ targetAssuntoId: aid, tipoRelacao: r.tipoRelacao })),
        });
      }
    }
    setPendingTopics((prev) => {
      const existing = new Set(prev.map((p) => p.tempId));
      return [...prev, ...newTopicMap.values().filter((p) => !existing.has(p.tempId))];
    });
    setPendingConcepts((prev) => [...prev, { tempId: `pc-${Date.now()}-${getNextId()}`, nome: newConceitoNome.trim(), relsToTopics, relsToPendingTopics }]);
    setNewConceitoNome("");
    setStagedRelations([]);
  };

  const addPendingAssunto = () => {
    if (!newAssuntoNome.trim()) return;
    setPendingAssuntos((prev) => [...prev, { tempId: `passunto-${Date.now()}-${getNextId()}`, nome: newAssuntoNome.trim() }]);
    setNewAssuntoNome("");
  };

  const toggleConcept = (id: string) => setSelectedConcepts((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const updateNotaConceitoRel = (conceitoId: string, tipo: string) => setNotaConceitoRels((prev) => prev.map((r) => r.conceitoId === conceitoId ? { ...r, tipoRelacao: tipo } : r));

  useEffect(() => {
    setNotaConceitoRels((prev) => {
      const existingIds = new Set(prev.map((r) => r.conceitoId));
      const added = Array.from(selectedConcepts).filter((id) => !existingIds.has(id));
      const updated = prev.filter((r) => selectedConcepts.has(r.conceitoId));
      return [...updated, ...added.map((id) => ({ conceitoId: id, tipoRelacao: "DEFINE" }))];
    });
  }, [selectedConcepts]);

  const handleSave = async () => {
    if (!titulo.trim()) { toast.error("Informe o titulo."); return; }
    if (!conteudo.trim()) { toast.error("Informe o conteudo."); return; }
    if (selectedConcepts.size === 0 && pendingConcepts.length === 0) { toast.error("Selecione ou adicione ao menos um conceito."); return; }
    setSaving(true);
    try {
      const assuntoIdMap = new Map<string, string>();
      for (const pa of pendingAssuntos) { const c = await createAssunto(pa.nome); assuntoIdMap.set(pa.tempId, c.id); }
      const pendingTopicSet = new Map<string, PendingTopic>();
      for (const pc of pendingConcepts) for (const r of pc.relsToPendingTopics) if (!pendingTopicSet.has(r.tempTopicoId)) { const pt = pendingTopics.find((t) => t.tempId === r.tempTopicoId); if (pt) pendingTopicSet.set(r.tempTopicoId, pt); }
      const topicIdMap = new Map<string, string>();
      for (const [tempId, pt] of pendingTopicSet) {
        if (pt.relsToAssuntos.length === 0) continue;
        const realAid = assuntoIdMap.get(pt.relsToAssuntos[0].targetAssuntoId) ?? pt.relsToAssuntos[0].targetAssuntoId;
        const c = await createTopico(pt.nome, realAid);
        topicIdMap.set(tempId, c.id);
      }
      const createdConceptIds: string[] = [];
      for (const pc of pendingConcepts) {
        let firstTopicoId: string | undefined = pc.relsToTopics.length > 0 ? pc.relsToTopics[0].targetTopicoId : topicIdMap.get(pc.relsToPendingTopics[0]?.tempTopicoId);
        if (!firstTopicoId) continue;
        let foundAssuntoId = "";
        for (const a of arvore) for (const rel of a.relAssuntoTopico) { if (rel.topicos.find((tp) => tp.id === firstTopicoId)) { foundAssuntoId = a.id; break; } if (foundAssuntoId) break; }
        if (!foundAssuntoId) { for (const pt of pendingTopicSet.values()) { if (topicIdMap.get(pt.tempId) === firstTopicoId && pt.relsToAssuntos.length > 0) { foundAssuntoId = assuntoIdMap.get(pt.relsToAssuntos[0].targetAssuntoId) ?? pt.relsToAssuntos[0].targetAssuntoId; break; } } }
        if (!foundAssuntoId && arvore.length > 0) foundAssuntoId = arvore[0].id;
        const c = await createFullConcept({ nome: pc.nome, assuntoId: foundAssuntoId, topicoId: firstTopicoId });
        createdConceptIds.push(c.id);
        conceptMap.set(c.id, { nome: c.nome, topicoNome: "", assuntoNome: "" });
      }
      const allIds = new Set([...selectedConcepts, ...createdConceptIds]);
      const { notaId } = await createNotaManual({
        titulo: titulo.trim(), conteudo: conteudo.trim(), subtipo, selectedConceitoIds: Array.from(allIds),
        notaConceitoRels: notaConceitoRels.concat(createdConceptIds.map((id) => ({ conceitoId: id, tipoRelacao: "DEFINE" as const }))),
        conceitoConceitoRels,
      });
      toast.success("Nota criada com sucesso!");
      router.push(`/notes/${notaId}`);
    } catch (err) { console.error(err); toast.error("Erro ao criar nota."); setSaving(false); }
  };

  const getConceptName = (id: string) => conceptMap.get(id)?.nome || id;
  const totalSelected = selectedConcepts.size + pendingConcepts.length;

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="space-y-5">
      {/* Step 0: Subtipo */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">1</div>
            <div>
              <CardTitle className="text-sm">Tipo de conteúdo</CardTitle>
              <CardDescription className="text-[10px]">O que esta nota representa? Isso guia o template.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SUBTIPO_CONFIG.map((cfg) => {
              const Icon = cfg.icon;
              const sel = subtipo === cfg.value;
              return (
                <button
                  key={cfg.value}
                  type="button"
                  onClick={() => {
                    setSubtipo(sel ? null : cfg.value);
                    if (!sel && !conteudo.trim()) setConteudo(cfg.template);
                  }}
                  className={`flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors ${sel ? "border-primary bg-primary/[0.05]" : "border-zinc-200 dark:border-zinc-700 hover:border-primary/40"}`}
                >
                  <Icon className={`size-4 ${sel ? "text-primary" : "text-zinc-400"}`} />
                  <span className={`text-xs font-medium leading-tight ${sel ? "text-primary" : ""}`}>{cfg.label}</span>
                  <span className="text-[10px] text-zinc-400 leading-tight">{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Note data */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">2</div>
            <div>
              <CardTitle className="text-sm">Dados da nota</CardTitle>
              <CardDescription className="text-[10px]">Titulo e conteudo da nota.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-5 space-y-3">
          <FormField label="Titulo" error={titleError}>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Aula de Direito - Soberania" className="h-9" />
          </FormField>
          <div className="space-y-1">
            <FormField label="Conteudo" error={contentError}>
              <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Conteudo da nota..." className="min-h-[150px] font-mono text-xs sm:text-sm" rows={8} />
            </FormField>
            {wordCount > 0 && <p className="text-[10px] text-zinc-400">{wordCount} palavras</p>}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Concepts — search + tree */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">3</div>
              <div>
                <CardTitle className="text-sm">Conceitos</CardTitle>
                <CardDescription className="text-[10px]">Selecione existentes ou crie novos abaixo.</CardDescription>
              </div>
            </div>
            {totalSelected > 0 && (
              <Badge className="text-xs">{totalSelected}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-5 space-y-3">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <Input placeholder="Buscar conceito, topico ou materia..." className="pl-9 h-9 text-sm" value={conceptSearch} onChange={(e) => { setConceptSearch(e.target.value); setShowFlatList(e.target.value.length > 0); }} onFocus={() => setShowFlatList(conceptSearch.length > 0)} />
          </div>

          {/* Flat search results */}
          {showFlatList && (
            <div className="max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredFlat.length === 0 ? <p className="text-xs text-zinc-400 py-3 text-center">Nenhum conceito encontrado.</p> : filteredFlat.slice(0, 30).map((fc) => {
                const sel = selectedConcepts.has(fc.id);
                return (
                  <button key={fc.id} type="button" className={`w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${sel ? "bg-primary/[0.04]" : ""}`} onClick={() => { toggleConcept(fc.id); setShowFlatList(false); setConceptSearch(""); }}>
                    <div className={`size-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${sel ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>{sel && <CheckCircle2Icon className="size-2.5 text-primary-foreground" />}</div>
                    <span className="text-xs flex-1 truncate">{fc.nome}</span>
                    <span className="text-[10px] text-zinc-400">{fc.assuntoNome} / {fc.topicoNome}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tree */}
          {!showFlatList && (
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {loadingConcepts ? (<div className="flex items-center gap-2 text-sm text-zinc-400 py-6 justify-center"><Loader2Icon className="size-4 animate-spin" /> Carregando...</div>) : flatConcepts.length === 0 ? (<p className="text-xs text-zinc-400 py-6 text-center">Nenhum conceito disponivel.</p>) : arvore.map((assunto) => {
                const ae = expandedAssuntos.has(assunto.id);
                let ts = 0;
                for (const rel of assunto.relAssuntoTopico) for (const tp of rel.topicos) for (const rc of tp.relacoesTopicoConceito) ts += rc.conceitos.filter((c) => selectedConcepts.has(c.id)).length;
                return (
                  <div key={assunto.id} className="rounded-md border border-zinc-200 dark:border-zinc-800">
                    <button type="button" className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => { if (ae) setExpandedAssuntos(p => { const n = new Set(p); n.delete(assunto.id); return n; }); else { const n = new Set(expandedAssuntos); n.add(assunto.id); setExpandedAssuntos(n); } }}>
                      {ae ? <ChevronDownIcon className="size-3.5 text-zinc-400" /> : <ChevronRightIcon className="size-3.5 text-zinc-400" />}
                      <span className="text-sm">{assunto.nome}</span>
                      {ts > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto">{ts}</Badge>}
                    </button>
                    {ae && assunto.relAssuntoTopico.map((rg) => {
                      const re = expandedRelAssuntos.has(assunto.id);
                      return (
                        <div key={rg.tipoRelacao}>
                          <button type="button" className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => { if (re) setExpandedRelAssuntos(p => { const n = new Set(p); n.delete(assunto.id); return n; }); else { const n = new Set(expandedRelAssuntos); n.add(assunto.id); setExpandedRelAssuntos(n); } }}>
                            {re ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />}
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{rg.tipoRelacao}</Badge>
                          </button>
                          {re && <div className="ml-2 border-l border-zinc-200 dark:border-zinc-700">{rg.topicos.map((topico) => {
                            const te = expandedTopics.has(topico.id);
                            let tsc = 0;
                            for (const rc of topico.relacoesTopicoConceito) tsc += rc.conceitos.filter((c) => selectedConcepts.has(c.id)).length;
                            return (
                              <div key={topico.id}>
                                <button type="button" className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => { if (te) setExpandedTopics(p => { const n = new Set(p); n.delete(topico.id); return n; }); else { const n = new Set(expandedTopics); n.add(topico.id); setExpandedTopics(n); } }}>
                                  {te ? <ChevronDownIcon className="size-3 text-zinc-400" /> : <ChevronRightIcon className="size-3 text-zinc-400" />}
                                  <span className="text-xs text-zinc-500">{topico.nome}</span>
                                  {tsc > 0 && <span className="ml-auto text-[10px] text-emerald-500">{tsc}</span>}
                                </button>
                                {te && topico.relacoesTopicoConceito.map((rtc) => {
                                  const rte = expandedRelTopicos.has(topico.id);
                                  return (
                                    <div key={rtc.tipoRelacao}>
                                      <button type="button" className="w-full flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800" onClick={() => { if (rte) setExpandedRelTopicos(p => { const n = new Set(p); n.delete(topico.id); return n; }); else { const n = new Set(expandedRelTopicos); n.add(topico.id); setExpandedRelTopicos(n); } }}>
                                        {rte ? <ChevronDownIcon className="size-2.5" /> : <ChevronRightIcon className="size-2.5" />}
                                        <Badge variant="outline" className="text-[9px] h-3.5 px-0.5">{rtc.tipoRelacao}</Badge>
                                      </button>
                                      {rte && <div className="ml-2 border-l border-zinc-200 dark:border-zinc-700">{rtc.conceitos.map((c) => {
                                        const sel = selectedConcepts.has(c.id);
                                        return (
                                          <button key={c.id} type="button" className={`w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 ${sel ? "bg-primary/[0.04]" : ""}`} onClick={() => toggleConcept(c.id)}>
                                            <div className={`size-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center ${sel ? "bg-primary border-primary text-primary-foreground" : "border-zinc-300 dark:border-zinc-600"}`}>{sel && <CheckCircle2Icon className="size-2.5" />}</div>
                                            <span className="text-xs text-zinc-700 dark:text-zinc-300">{c.nome}</span>
                                          </button>
                                        );
                                      })}</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected concepts summary */}
          {selectedConcepts.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from(selectedConcepts).map((id) => {
                const info = conceptMap.get(id);
                return (
                  <Badge key={id} variant="secondary" className="text-[10px] gap-1 px-1.5 h-6">
                    {info?.nome || id}
                    <button type="button" onClick={() => toggleConcept(id)}><XIcon className="size-3 ml-0.5" /></button>
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nota -> Conceito relations */}
      {selectedConcepts.size > 0 && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="px-3 sm:px-5 pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><LinkIcon className="size-4" />Relacoes: Nota → Conceito</CardTitle>
            <CardDescription className="text-[10px]">Como a nota se relaciona com cada conceito.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-5 space-y-2">
            {notaConceitoRels.map((rel) => (
              <div key={rel.conceitoId} className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-28 truncate">{getConceptName(rel.conceitoId)}</span>
                <select value={rel.tipoRelacao} onChange={(e) => updateNotaConceitoRel(rel.conceitoId, e.target.value)} className="flex-1 h-8 px-2 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background">
                  {NOTA_TO_CONCEITO_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Conceito -> Conceito relations */}
      {selectedConcepts.size >= 2 && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="px-3 sm:px-5 pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><LinkIcon className="size-4" />Relacoes: Conceito ↔ Conceito</CardTitle>
            <CardDescription className="text-[10px]">Relacoes semanticas entre conceitos.</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-5 space-y-3">
            {conceitoConceitoRels.map((rel, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-1.5 items-start sm:items-center">
                <select value={rel.origemId} onChange={(e) => { setConceitoConceitoRels((p) => p.map((r, i) => i === idx ? { ...r, origemId: e.target.value } : r)); }} className="h-8 px-2 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-1 min-w-0">
                  {Array.from(selectedConcepts).map((id) => (<option key={id} value={id}>{getConceptName(id)}</option>))}
                </select>
                <select value={rel.tipoRelacao} onChange={(e) => { setConceitoConceitoRels((p) => p.map((r, i) => i === idx ? { ...r, tipoRelacao: e.target.value } : r)); }} className="h-8 px-2 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background w-28 flex-shrink-0">
                  {CONCEITO_TO_CONCEITO_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
                <ArrowRightIcon className="size-3.5 text-zinc-400 flex-shrink-0 mx-1" />
                <select value={rel.destinoId} onChange={(e) => { setConceitoConceitoRels((p) => p.map((r, i) => i === idx ? { ...r, destinoId: e.target.value } : r)); }} className="h-8 px-2 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-1 min-w-0">
                  {Array.from(selectedConcepts).filter((id) => id !== rel.origemId).map((id) => (<option key={id} value={id}>{getConceptName(id)}</option>))}
                </select>
                <button type="button" onClick={() => setConceitoConceitoRels((p) => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-500 flex-shrink-0"><XIcon className="size-3.5" /></button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => { const ids = Array.from(selectedConcepts); if (ids.length >= 2) setConceitoConceitoRels((p) => [...p, { origemId: ids[0], destinoId: ids[1], tipoRelacao: "RELACIONADO" }]); }}><PlusIcon className="size-3.5 mr-1" />Adicionar relacao</Button>
          </CardContent>
        </Card>
      )}

      {/* Novo Conceito — unified card */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="px-3 sm:px-5 pb-3">
          <div className="flex items-center gap-2">
            <PlusCircleIcon className="size-4 text-zinc-400" />
            <div>
              <CardTitle className="text-sm">Criar novo conceito</CardTitle>
              <CardDescription className="text-[10px]">Defina o conceito e vincule a topicos existentes ou novos.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-5 space-y-3">
          <div className="space-y-2">
            <Label>Nome do conceito</Label>
            <Input value={newConceitoNome} onChange={(e) => setNewConceitoNome(e.target.value)} placeholder="Ex: Principio da Legalidade" className="h-9" />
          </div>

          {/* Toggle */}
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5 w-fit">
            <button type="button" onClick={() => setRelationMode("existing")} className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${relationMode === "existing" ? "bg-white dark:bg-zinc-700 shadow" : "text-zinc-500"}`}>Topico existente</button>
            <button type="button" onClick={() => setRelationMode("new")} className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${relationMode === "new" ? "bg-white dark:bg-zinc-700 shadow" : "text-zinc-500"}`}>Novo topico</button>
          </div>

          {relationMode === "existing" && (
            <div className="space-y-2">
              <div className="max-h-44 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
                {existingTopicosByAssunto.map((group) => {
                  const allIn = group.topicos.length > 0 && group.topicos.every((t) => selectedExistingTopics.some((s) => s.id === t.id));
                  const sel = group.topicos.filter((t) => selectedExistingTopics.some((s) => s.id === t.id));
                  return (
                    <div key={group.assuntoId} className="px-2 py-1.5">
                      <button type="button" onClick={() => { const ids = group.topicos.map((t) => t.id); if (allIn) setSelectedExistingTopics((p) => p.filter((x) => !ids.includes(x.id))); else setSelectedExistingTopics((p) => [...p, ...group.topicos.map((t) => ({ id: t.id, tipoRelacao: "FUNDAMENTA" }))]); }} className="flex items-center gap-1 mb-1">
                        <div className={`size-3.5 rounded border flex items-center justify-center flex-shrink-0 ${allIn ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>{allIn && <CheckCircle2Icon className="size-3 text-white" />}</div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase">{group.assuntoNome}</span>
                        {sel.length > 0 && <span className="text-[10px] text-emerald-500 ml-auto">{sel.length}/{group.topicos.length}</span>}
                      </button>
                      <div className="ml-5 space-y-1">
                        {group.topicos.map((t) => {
                          const isSel = selectedExistingTopics.some((s) => s.id === t.id);
                          return (
                            <div key={t.id} className="flex items-center gap-2 px-1">
                              <button type="button" onClick={() => toggleExistingTopicSelect(t.id, "FUNDAMENTA")} className="flex-shrink-0">
                                <div className={`size-3.5 rounded border flex items-center justify-center ${isSel ? "bg-primary border-primary" : "border-zinc-300 dark:border-zinc-600"}`}>{isSel && <CheckCircle2Icon className="size-3 text-white" />}</div>
                              </button>
                              <span className={`text-xs flex-1 truncate ${isSel ? "font-medium" : "text-zinc-500"}`}>{t.nome}</span>
                              {isSel && (<select value={selectedExistingTopics.find((s) => s.id === t.id)?.tipoRelacao} onChange={(e) => updateExistingTopicRelType(t.id, e.target.value)} className="h-7 px-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-shrink-0">{CONCEITO_TO_TOPICO_TYPES.map((rt) => (<option key={rt.value} value={rt.value}>{rt.label}</option>))}</select>)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedExistingTopics.length > 0 && (
                <div className="flex items-center justify-between"><span className="text-[10px] text-zinc-400">{selectedExistingTopics.length} topico(s)</span><button type="button" onClick={() => setSelectedExistingTopics([])} className="text-[10px] text-red-400 hover:text-red-500">Limpar</button></div>
              )}
              <Button type="button" onClick={addExistingTopicRelation} disabled={selectedExistingTopics.length === 0} size="sm" className="w-full"><LinkIcon className="size-3 mr-1" />Vincular</Button>
            </div>
          )}

          {relationMode === "new" && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-zinc-400">Nome do novo topico</Label>
                <Input value={newTopicNome} onChange={(e) => setNewTopicNome(e.target.value)} placeholder="Ex: Direito Constitucional" className="h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-zinc-400">Vincular a materias</Label>
                <div className="max-h-32 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md divide-y divide-zinc-100 dark:divide-zinc-800">
                  {arvore.map((a) => {
                    const isSel = newTopicSelectedAssuntos.some((s) => s.id === a.id);
                    return (
                      <div key={a.id} className="flex items-center gap-2 py-1 px-2">
                        <button type="button" onClick={() => { if (isSel) setNewTopicSelectedAssuntos((p) => p.filter((x) => x.id !== a.id)); else setNewTopicSelectedAssuntos((p) => [...p, { id: a.id, nome: a.nome, tipoRelacao: "PERTENCE_A" }]); }} className="flex-shrink-0">
                          <div className={`size-3.5 rounded border flex items-center justify-center ${isSel ? "bg-primary/10 border-primary text-primary" : "border-zinc-300 dark:border-zinc-600"}`}>{isSel && <CheckCircle2Icon className="size-3" />}</div>
                        </button>
                        <span className={`text-xs flex-1 ${isSel ? "font-medium" : "text-zinc-500"}`}>{a.nome}</span>
                        {isSel && (<select value={newTopicSelectedAssuntos.find((s) => s.id === a.id)?.tipoRelacao} onChange={(e) => updateAssuntoRelType(a.id, e.target.value)} className="h-7 px-1.5 border border-zinc-200 dark:border-zinc-700 rounded text-xs bg-background flex-shrink-0"><option value="PERTENCE_A">PERTENCE_A</option><option value="APLICADO_EM">APLICADO_EM</option></select>)}
                      </div>
                    );
                  })}
                  {pendingAssuntos.map((pa) => {
                    const isSel = newTopicSelectedAssuntos.some((s) => s.id === pa.tempId);
                    return (
                      <div key={pa.tempId} className="flex items-center gap-2 py-1 px-2">
                        <button type="button" onClick={() => { if (isSel) setNewTopicSelectedAssuntos((p) => p.filter((x) => x.id !== pa.tempId)); else setNewTopicSelectedAssuntos((p) => [...p, { id: pa.tempId, nome: pa.nome, tipoRelacao: "PERTENCE_A" }]); }} className="flex-shrink-0">
                          <div className={`size-3.5 rounded border flex items-center justify-center ${isSel ? "bg-emerald-100 border-emerald-400 text-emerald-600" : "border-zinc-300 dark:border-zinc-600"}`}>{isSel && <CheckCircle2Icon className="size-3" />}</div>
                        </button>
                        <span className="text-xs flex-1">{pa.nome}</span>
                        <Badge variant="outline" className="text-[8px] h-3.5 px-0.5 text-emerald-500 border-emerald-300 flex-shrink-0">nova</Badge>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 items-end">
                  <Input value={newAssuntoNome} onChange={(e) => setNewAssuntoNome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newAssuntoNome.trim()) addPendingAssunto(); }} placeholder="Nova materia" className="h-8 flex-1" />
                  <Button type="button" onClick={addPendingAssunto} disabled={!newAssuntoNome.trim()} size="sm" className="h-8"><PlusIcon className="size-3 mr-1" />Materia</Button>
                </div>
              </div>
              <Button type="button" onClick={addNewTopicRelation} disabled={!newTopicNome.trim() || newTopicSelectedAssuntos.length === 0} size="sm" className="w-full"><LinkIcon className="size-3 mr-1" />Vincular</Button>
            </div>
          )}

          {/* Staged relations */}
          {stagedRelations.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Relacoes do conceito:</Label>
              {stagedRelations.map((r, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-md px-2 py-1 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <Badge variant="outline" className="text-[10px] h-5 px-1 flex-shrink-0">{r.tipoRelacao}</Badge>
                  {r.kind === "existing-topic" ? (<span>Topico: <b>{r.topicNome}</b></span>) : (<span>Novo topico: <b>{r.topicNome}</b> <span className="text-zinc-400">({r.targetAssuntoNomes.join(", ")})</span></span>)}
                  <button type="button" onClick={() => removeStagedRelation(idx)} className="ml-auto text-zinc-400 hover:text-red-500"><XIcon className="size-3" /></button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={addConceptToQueue} disabled={!newConceitoNome.trim() || stagedRelations.length === 0} size="sm" className="w-full"><PlusIcon className="size-3.5 mr-1" />Adicionar conceito a fila</Button>

          {/* Pending queue */}
          {pendingConcepts.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs font-medium text-zinc-500">{pendingConcepts.length} conceito(s) na fila:</p>
              {pendingConcepts.map((pc) => (
                <div key={pc.tempId} className="flex items-start justify-between bg-zinc-50 dark:bg-zinc-900/50 rounded-md px-3 py-2 border border-zinc-200 dark:border-zinc-800">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{pc.nome}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pc.relsToTopics.map((r, i) => (<Badge key={i} variant="outline" className="text-[10px] h-4 px-1">{r.tipoRelacao}: {getTopicName(r.targetTopicoId)}</Badge>))}
                      {pc.relsToPendingTopics.map((r) => {
                        const pt = pendingTopics.find((t) => t.tempId === r.tempTopicoId);
                        return (<Badge key={r.tempTopicoId} variant="secondary" className="text-[10px] h-4 px-1">tp. &quot;{pt?.nome}&quot;</Badge>);
                      })}
                    </div>
                  </div>
                  <button type="button" onClick={() => setPendingConcepts((p) => p.filter((c) => c.tempId !== pc.tempId))} className="flex-shrink-0 text-zinc-400 hover:text-red-500 ml-2"><XIcon className="size-4" /></button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation */}
      {(titleError || contentError || (totalSelected === 0 && titulo.trim() && conteudo.trim())) && (
        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
          Preencha titulo, conteudo e selecione ao menos um conceito.
        </div>
      )}

      {/* Save bar */}
      <Button onClick={handleSave} disabled={saving} size="lg" className="w-full">
        {saving ? (<><Loader2Icon className="size-4 mr-1 animate-spin" /> Salvando...</>) : (() => {
          const parts: string[] = [];
          if (pendingTopics.length > 0) parts.push(`${pendingTopics.length} topico(s)`);
          if (pendingConcepts.length > 0) parts.push(`${pendingConcepts.length} conceito(s)`);
          return parts.length > 0 ? (<><CheckCircle2Icon className="size-4 mr-1" /> Criar nota e {parts.join(", ")}</>) : (<><CheckCircle2Icon className="size-4 mr-1" /> Criar nota</>);
        })()}
      </Button>
    </div>
  );
}

// ==========================================
// Page
// ==========================================

export default function NewNotaPage() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("ia");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Nova Nota</h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {mode === "ia" ? "Cole texto bruto e a IA identifica notas." : "Preencha manualmente com relacoes."}
        </p>
      </div>
      <Separator />
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
        <button onClick={() => setMode("ia")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "ia" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <SparklesIcon className="size-4" /> Via IA
        </button>
        <button onClick={() => setMode("manual")} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-colors ${mode === "manual" ? "bg-white dark:bg-zinc-700 shadow text-foreground" : "text-zinc-500"}`}>
          <BrainIcon className="size-4" /> Manual
        </button>
      </div>
      {mode === "ia" ? <IAModeContent router={router} /> : <ManualModeContent router={router} />}
    </div>
  );
}
