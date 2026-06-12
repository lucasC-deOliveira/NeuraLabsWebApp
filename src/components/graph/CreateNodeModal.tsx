"use client";

import { useState, useEffect } from "react";
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
import { PlusIcon, Loader2Icon, SparklesIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { suggestNotaRelations, type NotaRelationSuggestion } from "@/actions/ai-graph";
import { createBaralhoNode } from "@/actions/graph";
import { getFlashcards } from "@/actions/flashcard";
import { getAllowedRelations } from "@/modules/graph/domain/services/relation-rules";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { useRouter } from "next/navigation";


// relações possíveis entre um Tópico (origem) e um Assunto (destino)
const TOPICO_ASSUNTO_RELATIONS = getAllowedRelations("TOPICO", "ASSUNTO");
// relações possíveis entre um Conceito (origem) e um Tópico (destino)
const CONCEITO_TOPICO_RELATIONS = getAllowedRelations("CONCEITO", "TOPICO");

type TopicoAssuntoLink = { assuntoId: string; relacao: string; peso: number };
type ConceitoTopicoLink = { topicoId: string; relacao: string; peso: number };

interface CreateNodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  parentIds?: {
    assuntos: { id: string; nome: string }[];
    topicos: { id: string; nome: string }[];
    conceitos: { id: string; nome: string }[];
  };
  onSuccess?: () => void;
}

export function CreateNodeModal({
  open,
  onOpenChange,
  grafoId,
  parentIds = { assuntos: [], topicos: [], conceitos: [] },
  onSuccess,
}: CreateNodeModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"create" | "existing">("create");
  const [selectedType, setSelectedType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [availableItems, setAvailableItems] = useState<{
    flashcards: Array<{ id: string; label: string; fullText: string; tipo: string; hierarquia: string; conceitoId?: string | null }>;
    notas: Array<{ id: string; label: string; fullText: string; tipo: string; hierarquia: string; conceitoId?: string | null }>;
  }>({ flashcards: [], notas: [] });
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
  const [deckLoading, setDeckLoading] = useState(false);
  // tópico: conjunto de assuntos relacionados (relação + peso) escolhidos na criação
  const [topicoAssuntos, setTopicoAssuntos] = useState<TopicoAssuntoLink[]>([]);
  // conceito: conjunto de tópicos relacionados (relação + peso)
  const [conceitoTopicos, setConceitoTopicos] = useState<ConceitoTopicoLink[]>([]);

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

  // Load available items when modal opens
  useEffect(() => {
    if (open && activeTab === "existing") {
      loadAvailableItems();
    }
  }, [open, activeTab]);

  // Reset to "create" tab when selected type changes to non-FLASHCARD/NOTA
  useEffect(() => {
    if (selectedType && selectedType !== "FLASHCARD" && selectedType !== "NOTA") {
      setActiveTab("create");
    }
  }, [selectedType]);

  // Carrega os flashcards do usuário ao escolher criar um BARALHO
  useEffect(() => {
    if (!open || selectedType !== "BARALHO") return;
    setDeckLoading(true);
    getFlashcards()
      .then((fcs) =>
        setDeckFlashcards(fcs.map((f) => ({ id: f.id, pergunta: f.pergunta, conceito: f.conceito })))
      )
      .catch(() => toast.error("Erro ao carregar flashcards"))
      .finally(() => setDeckLoading(false));
  }, [open, selectedType]);

  const loadAvailableItems = async () => {
    try {
      const response = await fetch(`/api/graph/available-items?grafoId=${grafoId}`);
      if (!response.ok) {
        const text = await response.text();
        let msg = `Erro HTTP ${response.status}`;
        try {
          const json = JSON.parse(text);
          msg = json.error || msg;
        } catch {}
        throw new Error(msg);
      }
      const data = await response.json();
      setAvailableItems({
        flashcards: data.flashcards ?? [],
        notas: data.notas ?? [],
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("Erro ao carregar itens disponíveis:", e);
      toast.error(`Erro ao carregar itens disponíveis: ${message}`);
    }
  };

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
      const suggestions = await suggestNotaRelations(
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

  const handleSubmit = async () => {
    if (activeTab === "create") {
      // Original create flow
      if (!selectedType) {
        toast.error("Selecione um tipo de nó");
        return;
      }

      // BARALHO tem fluxo próprio (entidade + nó + arestas CONTEM, numa transação)
      if (selectedType === "BARALHO") {
        if (!formData.nome.trim()) {
          toast.error("Digite um título para o baralho");
          return;
        }
        setLoading(true);
        try {
          const r = await createBaralhoNode(
            grafoId,
            formData.nome.trim(),
            Array.from(deckSelected)
          );
          toast.success(
            deckSelected.size > 0
              ? `Baralho criado com ${deckSelected.size} flashcard(s)!`
              : "Baralho criado (vazio)!"
          );
          resetForm();
          onOpenChange(false);
          if (onSuccess) onSuccess();
          router.refresh();
          void r;
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erro ao criar baralho");
        } finally {
          setLoading(false);
        }
        return;
      }

      let payload: any = {};

      // Validate required fields and build payload based on type
      switch (selectedType) {
        case "ASSUNTO":
          if (!formData.nome.trim()) {
            toast.error("Digite um nome para o assunto");
            return;
          }
          payload = { nome: formData.nome.trim(), descricao: formData.descricao.trim() || null };
          break;
        case "TOPICO":
          if (!formData.nome.trim()) {
            toast.error("Digite um nome para o tópico");
            return;
          }
          // sem "assunto pai": a ligação com assuntos é feita por arestas (relação + peso)
          payload = { nome: formData.nome.trim(), descricao: formData.descricao.trim() || null, assuntoId: null };
          break;
        case "CONCEITO":
          if (!formData.nome.trim()) {
            toast.error("Digite um nome para o conceito");
            return;
          }
          // sem "tópico pai": a ligação com tópicos é feita por arestas (relação + peso)
          payload = { nome: formData.nome.trim(), descricao: formData.descricao.trim() || null, topicoId: null };
          break;
        case "FLASHCARD":
          if (!formData.pergunta.trim()) {
            toast.error("Digite a pergunta do flashcard");
            return;
          }
          if (!formData.resposta.trim()) {
            toast.error("Digite a resposta para o flashcard");
            return;
          }
          
          payload = { pergunta: formData.pergunta.trim(), resposta: formData.resposta.trim() };
          break;
        case "NOTA":
          if (!formData.nome.trim()) {
            toast.error("Digite um título para a nota");
            return;
          }
          if (!formData.subtipo) {
            toast.error("Selecione o subtipo da nota");
            return;
          }
          if (formData.tipoNota === "LITERATURA" && !formData.fonte.trim()) {
            toast.error("Notas de referência exigem a fonte (livro, artigo, vídeo...)");
            return;
          }
          if (!formData.conteudo.trim()) {
            toast.error("Digite o texto da nota");
            return;
          }
          payload = {
            titulo: formData.nome.trim(),
            conteudo: formData.conteudo.trim(),
            tipoNota: formData.tipoNota,
            subtipo: formData.subtipo,
            fonte: formData.fonte.trim() || null,
          };
          break;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/graph/add-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grafoId,
            tipoNode: selectedType,
            ...payload,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao criar nó");
        }

        // arestas a criar após o nó: relações do tópico com assuntos (origem→destino
        // = tópico→assunto) ou relações de nota sugeridas pela IA e aceitas.
        const edgesToCreate: Array<{ targetNodeId: string; tipoRelacao: string; peso: number }> = [];
        if (selectedType === "TOPICO") {
          for (const link of topicoAssuntos) {
            if (!link.assuntoId) continue;
            const peso = Number.isFinite(link.peso) && link.peso > 0 ? Math.min(2, link.peso) : 1;
            edgesToCreate.push({ targetNodeId: link.assuntoId, tipoRelacao: link.relacao, peso });
          }
        } else if (selectedType === "CONCEITO") {
          for (const link of conceitoTopicos) {
            if (!link.topicoId) continue;
            const peso = Number.isFinite(link.peso) && link.peso > 0 ? Math.min(2, link.peso) : 1;
            edgesToCreate.push({ targetNodeId: link.topicoId, tipoRelacao: link.relacao, peso });
          }
        } else if (selectedType === "NOTA") {
          for (const sg of aiSuggestions.filter((s) => s.accepted)) {
            edgesToCreate.push({ targetNodeId: sg.nodeId, tipoRelacao: sg.relacao, peso: 1.0 });
          }
        }

        let createdEdges = 0;
        for (const e of edgesToCreate) {
          try {
            const edgeRes = await fetch("/api/graph/edge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                grafoId,
                sourceNodeId: data.nodeId,
                targetNodeId: e.targetNodeId,
                tipoRelacao: e.tipoRelacao,
                peso: e.peso,
              }),
            });
            if (edgeRes.ok) createdEdges++;
          } catch {
            // segue criando as demais
          }
        }

        toast.success(
          createdEdges > 0
            ? `Nó criado com ${createdEdges} relação(ões)!`
            : "Nó criado com sucesso!"
        );
        resetForm();
        setSelectedType("");
        onOpenChange(false);
        if (onSuccess) onSuccess();

        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao criar nó");
      } finally {
        setLoading(false);
      }
    } else {
      // Add existing items flow
      const itemsToAdd = Array.from(selectedItems);
      if (itemsToAdd.length === 0) {
        toast.error("Selecione pelo menos um item para adicionar");
        return;
      }

      setLoading(true);
      try {
        // Add each selected item to the graph
        for (const itemId of itemsToAdd) {
          // Determine item type from availableItems
          const flashcard = availableItems.flashcards.find((f) => f.id === itemId);
          const nota = availableItems.notas.find((n) => n.id === itemId);

          let tipoNode: string;
          let data: any = { entityId: itemId }; // Send entityId to indicate existing item

          if (flashcard) {
            tipoNode = "FLASHCARD";
            // For existing flashcards, we still need the conceitoId for the nodeConhecimento
            data.conceitoId = flashcard.conceitoId;
          } else if (nota) {
            tipoNode = "NOTA";
          } else {
            continue; // Skip unknown items
          }

          const response = await fetch("/api/graph/add-node", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grafoId,
              tipoNode,
              ...data,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro ao adicionar item ${itemId}`);
          }
        }

        toast.success(`${itemsToAdd.length} item(s) adicionado(s) ao grafo!`);
        resetForm();
        setSelectedItems(new Set());
        setSearchQuery("");
        onOpenChange(false);
        if (onSuccess) onSuccess();
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao adicionar itens");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

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
            {/* Search */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Buscar flashcards e notas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-transparent"
              />
            </div>

            {/* Items list */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {availableItems.flashcards.length === 0 && availableItems.notas.length === 0 ? (
                <p className="text-center text-zinc-500 py-8">Nenhum item disponível</p>
              ) : (
                <>
                  {/* Flashcardssection */}
                  {availableItems.flashcards.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Flashcards</h4>
                      {availableItems.flashcards
                        .filter((fc) => searchQuery === "" || fc.label.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((flashcard) => (
                          <div
                            key={flashcard.id}
                            className={`flex items-start gap-2 p-2 border rounded cursor-pointer transition-colors ${
                              selectedItems.has(flashcard.id)
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            }`}
                            onClick={() => {
                              setSelectedItems((prev) => {
                                const next = new Set(prev);
                                if (next.has(flashcard.id)) {
                                  next.delete(flashcard.id);
                                } else {
                                  next.add(flashcard.id);
                                }
                                return next;
                              });
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedItems.has(flashcard.id)}
                              onChange={() => {}}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{flashcard.label}</div>
                              <div className="text-xs text-zinc-500 truncate">{flashcard.hierarquia}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Notas section */}
                  {availableItems.notas.length > 0 && (
                    <div className="space-y-1 mt-4">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Notas</h4>
                      {availableItems.notas
                        .filter((n) => searchQuery === "" || n.label.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((nota) => (
                          <div
                            key={nota.id}
                            className={`flex items-start gap-2 p-2 border rounded cursor-pointer transition-colors ${
                              selectedItems.has(nota.id)
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            }`}
                            onClick={() => {
                              setSelectedItems((prev) => {
                                const next = new Set(prev);
                                if (next.has(nota.id)) {
                                  next.delete(nota.id);
                                } else {
                                  next.add(nota.id);
                                }
                                return next;
                              });
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedItems.has(nota.id)}
                              onChange={() => {}}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{nota.label}</div>
                              <div className="text-xs text-zinc-500">{nota.hierarquia}</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

          {/* CREATE TAB: Form content */}
          {activeTab === "create" && (
            <>
              {/* Type selection */}
              <div className="space-y-2">
                <Label htmlFor="node-type">Tipo de nó</Label>
                <Select value={selectedType} onValueChange={(value) => setSelectedType(value ?? "")}>
                  <SelectTrigger id="node-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSUNTO">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#eef2ff] border border-[#4338ca] rounded" />
                        <span>Assunto</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="TOPICO">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#e0f2fe] border border-[#0369a1] rounded" />
                        <span>Tópico</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="CONCEITO">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#d1fae5] border border-[#059669] rounded" />
                        <span>Conceito</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="FLASHCARD">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#fef9c3] border border-[#eab308] rounded" />
                        <span>Flashcard</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="NOTA">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#fdf4ff] border border-[#9333ea] rounded" />
                        <span>Nota</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="BARALHO">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#fff7ed] border border-[#ea580c] rounded" />
                        <span>Baralho</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* BARALHO form */}
              {selectedType === "BARALHO" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="baralho-titulo">Título do baralho</Label>
                    <Input
                      id="baralho-titulo"
                      placeholder="Ex: Revisão de Redes"
                      value={formData.nome}
                      onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Flashcards do baralho (opcional)</Label>
                      <span className="text-xs text-muted-foreground">
                        {deckSelected.size} selecionado(s)
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar flashcards..."
                      value={deckSearch}
                      onChange={(e) => setDeckSearch(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                    />
                    <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-zinc-200 p-1 dark:border-zinc-800">
                      {deckLoading ? (
                        <p className="py-6 text-center text-xs text-muted-foreground">Carregando...</p>
                      ) : deckFlashcards.length === 0 ? (
                        <p className="py-6 text-center text-xs text-muted-foreground">
                          Você ainda não tem flashcards. O baralho pode ser criado vazio.
                        </p>
                      ) : (
                        deckFlashcards
                          .filter((fc) => deckSearch === "" || fc.pergunta.toLowerCase().includes(deckSearch.toLowerCase()))
                          .map((fc) => (
                            <label
                              key={fc.id}
                              className={`flex cursor-pointer items-start gap-2 rounded p-2 text-sm transition-colors ${
                                deckSelected.has(fc.id)
                                  ? "bg-primary/10 border border-primary"
                                  : "border border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={deckSelected.has(fc.id)}
                                onChange={() =>
                                  setDeckSelected((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(fc.id)) next.delete(fc.id);
                                    else next.add(fc.id);
                                    return next;
                                  })
                                }
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{fc.pergunta}</div>
                                {fc.conceito && (
                                  <div className="truncate text-xs text-muted-foreground">{fc.conceito}</div>
                                )}
                              </div>
                            </label>
                          ))
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Um flashcard pode estar em vários baralhos. Você pode adicionar mais depois.
                    </p>
                  </div>
                </div>
              )}

              {/* ASSUNTO form */}
              {selectedType === "ASSUNTO" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Direito Constitucional"
                      value={formData.nome}
                      onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="descricao">Descrição (opcional)</Label>
                    <Textarea
                      id="descricao"
                      placeholder="Breve descrição do assunto"
                      value={formData.descricao}
                      onChange={(e) => setFormData((f) => ({ ...f, descricao: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* TOPICO form */}
              {selectedType === "TOPICO" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="topico-nome">Nome</Label>
                    <Input
                      id="topico-nome"
                      placeholder="Ex: Princípios Fundamentais"
                      value={formData.nome}
                      onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="topico-descricao">Descrição (opcional)</Label>
                    <Textarea
                      id="topico-descricao"
                      placeholder="Breve descrição do tópico"
                      value={formData.descricao}
                      onChange={(e) => setFormData((f) => ({ ...f, descricao: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  {/* Assuntos relacionados (relação + peso) — substitui o "assunto pai" */}
                  <div className="space-y-2">
                    <Label>Assuntos relacionados (opcional)</Label>
                    {parentIds.assuntos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum assunto no grafo para relacionar.
                      </p>
                    ) : (
                      <>
                        {topicoAssuntos.map((link, idx) => {
                          // um assunto já escolhido em outra linha não aparece de novo
                          const usados = new Set(
                            topicoAssuntos
                              .filter((_, i) => i !== idx)
                              .map((l) => l.assuntoId)
                              .filter(Boolean)
                          );
                          const opcoes = parentIds.assuntos.filter(
                            (a) => a.id === link.assuntoId || !usados.has(a.id)
                          );
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <Select
                                value={link.assuntoId || "__none__"}
                                onValueChange={(value) =>
                                  setTopicoAssuntos((prev) =>
                                    prev.map((l, i) =>
                                      i === idx ? { ...l, assuntoId: value === "__none__" ? "" : value ?? "" } : l
                                    )
                                  )
                                }
                              >
                                <SelectTrigger className="flex-1 min-w-0">
                                  <SelectValue placeholder="Assunto" />
                                </SelectTrigger>
                                <SelectContent>
                                  {opcoes.map((a) => (
                                    <SelectItem key={a.id} value={a.id}>
                                      {a.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={link.relacao}
                                onValueChange={(value) =>
                                  setTopicoAssuntos((prev) =>
                                    prev.map((l, i) => (i === idx ? { ...l, relacao: value ?? l.relacao } : l))
                                  )
                                }
                              >
                                <SelectTrigger className="w-32 shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TOPICO_ASSUNTO_RELATIONS.map((r) => (
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
                                onChange={(e) =>
                                  setTopicoAssuntos((prev) =>
                                    prev.map((l, i) =>
                                      i === idx ? { ...l, peso: Number(e.target.value) } : l
                                    )
                                  )
                                }
                                className="w-16 shrink-0"
                              />
                              <button
                                type="button"
                                onClick={() => setTopicoAssuntos((prev) => prev.filter((_, i) => i !== idx))}
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                title="Remover"
                              >
                                <XIcon className="size-4" />
                              </button>
                            </div>
                          );
                        })}
                        {/* só dá pra adicionar enquanto houver assunto ainda não usado */}
                        {topicoAssuntos.length < parentIds.assuntos.length && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() =>
                              setTopicoAssuntos((prev) => [
                                ...prev,
                                { assuntoId: "", relacao: TOPICO_ASSUNTO_RELATIONS[0], peso: 1 },
                              ])
                            }
                          >
                            <PlusIcon className="size-3.5" />
                            Adicionar assunto
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* CONCEITO form */}
              {selectedType === "CONCEITO" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="conceito-nome">Nome</Label>
                    <Input
                      id="conceito-nome"
                      placeholder="Ex: Habeas Corpus"
                      value={formData.nome}
                      onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="conceito-descricao">Descrição (opcional)</Label>
                    <Textarea
                      id="conceito-descricao"
                      placeholder="Breve descrição do conceito"
                      value={formData.descricao}
                      onChange={(e) => setFormData((f) => ({ ...f, descricao: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  {/* Tópicos relacionados (relação + peso) — substitui o "tópico pai" */}
                  <div className="space-y-2">
                    <Label>Tópicos relacionados (opcional)</Label>
                    {parentIds.topicos.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Nenhum tópico no grafo para relacionar.
                      </p>
                    ) : (
                      <>
                        {conceitoTopicos.map((link, idx) => {
                          // um tópico já escolhido em outra linha não aparece de novo
                          const usados = new Set(
                            conceitoTopicos
                              .filter((_, i) => i !== idx)
                              .map((l) => l.topicoId)
                              .filter(Boolean)
                          );
                          const opcoes = parentIds.topicos.filter(
                            (t) => t.id === link.topicoId || !usados.has(t.id)
                          );
                          return (
                            <div key={idx} className="flex items-center gap-1.5">
                              <Select
                                value={link.topicoId || "__none__"}
                                onValueChange={(value) =>
                                  setConceitoTopicos((prev) =>
                                    prev.map((l, i) =>
                                      i === idx ? { ...l, topicoId: value === "__none__" ? "" : value ?? "" } : l
                                    )
                                  )
                                }
                              >
                                <SelectTrigger className="flex-1 min-w-0">
                                  <SelectValue placeholder="Tópico" />
                                </SelectTrigger>
                                <SelectContent>
                                  {opcoes.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={link.relacao}
                                onValueChange={(value) =>
                                  setConceitoTopicos((prev) =>
                                    prev.map((l, i) => (i === idx ? { ...l, relacao: value ?? l.relacao } : l))
                                  )
                                }
                              >
                                <SelectTrigger className="w-32 shrink-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONCEITO_TOPICO_RELATIONS.map((r) => (
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
                                onChange={(e) =>
                                  setConceitoTopicos((prev) =>
                                    prev.map((l, i) =>
                                      i === idx ? { ...l, peso: Number(e.target.value) } : l
                                    )
                                  )
                                }
                                className="w-16 shrink-0"
                              />
                              <button
                                type="button"
                                onClick={() => setConceitoTopicos((prev) => prev.filter((_, i) => i !== idx))}
                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                title="Remover"
                              >
                                <XIcon className="size-4" />
                              </button>
                            </div>
                          );
                        })}
                        {/* só dá pra adicionar enquanto houver tópico ainda não usado */}
                        {conceitoTopicos.length < parentIds.topicos.length && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() =>
                              setConceitoTopicos((prev) => [
                                ...prev,
                                { topicoId: "", relacao: CONCEITO_TOPICO_RELATIONS[0], peso: 1 },
                              ])
                            }
                          >
                            <PlusIcon className="size-3.5" />
                            Adicionar tópico
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* FLASHCARD form */}
              {selectedType === "FLASHCARD" && (
                <div className="space-y-3">
                 
                  <div className="space-y-1.5">
                    <Label htmlFor="pergunta">Pergunta</Label>
                    <Textarea
                      id="pergunta"
                      placeholder="O que você quer memorizar?"
                      value={formData.pergunta}
                      onChange={(e) => setFormData((f) => ({ ...f, pergunta: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="resposta">Resposta</Label>
                    <Textarea
                      id="resposta"
                      placeholder="A resposta para a pergunta"
                      value={formData.resposta}
                      onChange={(e) => setFormData((f) => ({ ...f, resposta: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* NOTA form */}
              {selectedType === "NOTA" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nota-titulo">Título</Label>
                    <Input
                      id="nota-titulo"
                      placeholder="Ex: SVM maximiza a margem entre classes"
                      value={formData.nome}
                      onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))}
                    />
                  </div>

                  {/* Zettelkasten: tipo da nota */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nota-tipo">Tipo de nota (Zettelkasten)</Label>
                    <Select
                      value={formData.tipoNota}
                      onValueChange={(value) => setFormData((f) => ({ ...f, tipoNota: value ?? "PERMANENTE" }))}
                    >
                      <SelectTrigger id="nota-tipo">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LITERATURA">
                          <div className="py-0.5">
                            <div className="font-medium">Nota de referência (literatura)</div>
                            <div className="text-xs text-muted-foreground">Anotações de leitura — próximas da fonte original</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="PERMANENTE">
                          <div className="py-0.5">
                            <div className="font-medium">Nota permanente</div>
                            <div className="text-xs text-muted-foreground">Uma ideia, suas palavras, compreensível isoladamente</div>
                          </div>
                        </SelectItem>
                        <SelectItem value="ESTRUTURA">
                          <div className="py-0.5">
                            <div className="font-medium">Nota de estrutura</div>
                            <div className="text-xs text-muted-foreground">Índice ou mapa de conhecimento</div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* subtipo do conteúdo */}
                  <div className="space-y-1.5">
                    <Label htmlFor="nota-subtipo">Subtipo</Label>
                    <Select
                      value={formData.subtipo}
                      onValueChange={(value) => setFormData((f) => ({ ...f, subtipo: value ?? "" }))}
                    >
                      <SelectTrigger id="nota-subtipo">
                        <SelectValue placeholder="Selecione o subtipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEFINICAO">Definição</SelectItem>
                        <SelectItem value="EXPLICACAO">Explicação</SelectItem>
                        <SelectItem value="EXEMPLO">Exemplo</SelectItem>
                        <SelectItem value="COMPARACAO">Comparação</SelectItem>
                        <SelectItem value="SINTESE">Síntese</SelectItem>
                        <SelectItem value="PREREQUISITO">Pré-requisito</SelectItem>
                        <SelectItem value="ERRO_COMUM">Erro comum</SelectItem>
                        <SelectItem value="APLICACAO">Aplicação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* fonte: obrigatória para notas de literatura */}
                  {formData.tipoNota === "LITERATURA" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="nota-fonte">Fonte</Label>
                      <Input
                        id="nota-fonte"
                        placeholder="Ex: Livro sobre Machine Learning, cap. 4"
                        value={formData.fonte}
                        onChange={(e) => setFormData((f) => ({ ...f, fonte: e.target.value }))}
                      />
                    </div>
                  )}

                  {formData.tipoNota === "PERMANENTE" && (
                    <p className="text-xs text-muted-foreground">
                      Dica: uma única ideia principal por nota. Depois, conecte-a a conceitos
                      pelo grafo (define, explica, aprofunda...).
                    </p>
                  )}
                  {formData.tipoNota === "ESTRUTURA" && (
                    <p className="text-xs text-muted-foreground">
                      Dica: use esta nota como índice — relacione-a aos tópicos e conceitos
                      que ela organiza.
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="texto-bruto">Texto da nota (suporta Markdown)</Label>
                    <Textarea
                      id="texto-bruto"
                      placeholder="Digite ou cole sua nota aqui... (markdown: # título, **negrito**, - listas, tabelas)"
                      value={formData.conteudo}
                      onChange={(e) => setFormData((f) => ({ ...f, conteudo: e.target.value }))}
                      rows={6}
                    />
                  </div>

                  {/* IA: sugerir relações com o grafo */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={handleSuggestRelations}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <SparklesIcon className="size-4" />
                    )}
                    Sugerir relações com IA
                  </Button>

                  {aiSuggestions.length > 0 && (
                    <div className="space-y-2 rounded-md border border-primary/40 p-2">
                      <p className="text-xs font-semibold text-primary">
                        Sugestões — desmarque as que não quiser; a relação é criada junto com a nota
                      </p>
                      {aiSuggestions.map((sg, idx) => (
                        <div key={sg.nodeId} className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={sg.accepted}
                            onChange={(e) =>
                              setAiSuggestions((prev) =>
                                prev.map((x, i) => (i === idx ? { ...x, accepted: e.target.checked } : x))
                              )
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">
                                {sg.nodeTipo.toLowerCase()}
                              </Badge>
                              <span className="truncate font-medium">{sg.nodeNome}</span>
                              <Select
                                value={sg.relacao}
                                onValueChange={(value) =>
                                  setAiSuggestions((prev) =>
                                    prev.map((x, i) => (i === idx ? { ...x, relacao: value ?? x.relacao } : x))
                                  )
                                }
                              >
                                <SelectTrigger className="h-6 w-auto px-2 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAllowedRelations("NOTA", sg.nodeTipo).map((rel) => (
                                    <SelectItem key={rel} value={rel}>
                                      {RELATION_LABELS[rel] ?? rel}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {sg.motivo && (
                              <p className="text-xs text-muted-foreground">{sg.motivo}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                {activeTab === "create"
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
