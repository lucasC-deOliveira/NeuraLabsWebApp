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
import { PlusIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState<{
    nome: string;
    descricao: string;
    assuntoId: string;
    topicoId: string;
    conceitoId: string;
    pergunta: string;
    resposta: string;
    textoBruto: string;
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
    textoBruto: "",
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
      setAvailableItems(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("Erro ao carregar itens disponíveis:", e);
      toast.error(`Erro ao carregar itens disponíveis: ${message}`);
    }
  };

  const resetForm = () => {
    setSelectedType("");
    setSelectedItems(new Set());
    setSearchQuery("");
    setFormData({
      nome: "",
      descricao: "",
      assuntoId: "",
      topicoId: "",
      conceitoId: "",
      pergunta: "",
      resposta: "",
      textoBruto: "",
      tipoNota: "PERMANENTE",
      subtipo: "",
      fonte: "",
    });
  };

  const handleSubmit = async () => {
    if (activeTab === "create") {
      // Original create flow
      if (!selectedType) {
        toast.error("Selecione um tipo de nó");
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
          payload = { nome: formData.nome.trim(), descricao: formData.descricao.trim() || null, assuntoId: formData.assuntoId || null };
          break;
        case "CONCEITO":
          if (!formData.nome.trim()) {
            toast.error("Digite um nome para o conceito");
            return;
          }
          payload = { nome: formData.nome.trim(), descricao: formData.descricao.trim() || null, topicoId: formData.topicoId || null };
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
          if (!formData.textoBruto.trim()) {
            toast.error("Digite o texto da nota");
            return;
          }
          payload = {
            titulo: formData.nome.trim(),
            textoBruto: formData.textoBruto.trim(),
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

        toast.success("Nó criado com sucesso!");
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar nós ao grafo</DialogTitle>
          <DialogDescription>
            Crie novos nós ou adicione flashcards e notas existentes ao grafo.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs - Only show "Adicionar existentes" for FLASHCARD or NOTA */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-4">
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
                  </SelectContent>
                </Select>
              </div>

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
                  <div className="space-y-1.5">
                    <Label htmlFor="assunto-pai">Assunto pai (opcional)</Label>
                    <Select
                      value={formData.assuntoId || "__none__"}
                      onValueChange={(value) =>
                        setFormData((f) => ({ ...f, assuntoId: value === "__none__" ? "" : value ?? "" }))
                      }
                    >
                      <SelectTrigger id="assunto-pai">
                        <SelectValue placeholder="Sem assunto pai" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem assunto pai</SelectItem>
                        {parentIds.assuntos.map((assunto) => (
                          <SelectItem key={assunto.id} value={assunto.id}>
                            {assunto.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <div className="space-y-1.5">
                    <Label htmlFor="topico-pai">Tópico pai (opcional)</Label>
                    <Select
                      value={formData.topicoId || "__none__"}
                      onValueChange={(value) =>
                        setFormData((f) => ({ ...f, topicoId: value === "__none__" ? "" : value ?? "" }))
                      }
                    >
                      <SelectTrigger id="topico-pai">
                        <SelectValue placeholder="Sem tópico pai" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem tópico pai</SelectItem>
                        {parentIds.topicos.map((topico) => (
                          <SelectItem key={topico.id} value={topico.id}>
                            {topico.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      value={formData.textoBruto}
                      onChange={(e) => setFormData((f) => ({ ...f, textoBruto: e.target.value }))}
                      rows={6}
                    />
                  </div>
                </div>
              )}
            </>
          )}

        <DialogFooter>
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
