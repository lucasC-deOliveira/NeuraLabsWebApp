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
import { PlusIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { suggestNotaRelations, type NotaRelationSuggestion } from "@/actions/ai-graph";
import { importGraphNotas, createBaralhoNode } from "@/actions/graph";
import { getFlashcards } from "@/actions/flashcard";
import { getAllowedRelations, isRelationAllowed } from "@/modules/graph/domain/services/relation-rules";
import { RELATION_LABELS } from "@/modules/graph/constants/graph-ui.constants";
import { useRouter } from "next/navigation";

const NOTA_TIPOS = ["LITERATURA", "PERMANENTE", "ESTRUTURA"] as const;
const NOTA_SUBTIPOS = [
  "DEFINICAO", "EXPLICACAO", "EXEMPLO", "COMPARACAO",
  "SINTESE", "PREREQUISITO", "ERRO_COMUM", "APLICACAO",
] as const;

// Tipos de nó que podem ser ligados a uma NOTA (origem da relação).
const NOTA_RELATABLE_TYPES = ["CONCEITO", "TOPICO", "ASSUNTO"] as const;

// Limites de segurança da importação por JSON (evitam DoS/abuso com entradas enormes).
const IMPORT_LIMITS = {
  notas: 500,
  relacoesPorNota: 100,
  flashcardsPorNota: 100,
  raw: 5_000_000, // tamanho máximo do texto colado (~5 MB)
  titulo: 500,
  conteudo: 50_000,
  texto: 200_000,
  nome: 500,
  descricao: 5_000,
  pergunta: 10_000,
  resposta: 10_000,
  fonte: 1_000,
} as const;

// Lê uma string obrigatória/opcional aplicando trim e limite de tamanho.
function readStr(
  value: unknown,
  field: string,
  max: number,
  ctx: string
): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length > max) {
    throw new Error(`"${field}" excede o limite de ${max} caracteres${ctx}.`);
  }
  return s;
}

const JSON_EXEMPLO = JSON.stringify(
  {
    textoBruto: {
      titulo: "Aula 4 — SVM e kernels",
      texto:
        "Texto original completo do qual as notas foram geradas. As notas abaixo ficam ligadas a este texto por uma relação 'gera'.",
    },
    notas: [
      {
        titulo: "SVM maximiza a margem entre classes",
        conteudo:
          "A SVM busca o hiperplano que separa as classes com a maior margem possível. Os pontos mais próximos do hiperplano são os vetores de suporte.",
        tipoNota: "PERMANENTE",
        subtipo: "DEFINICAO",
        fonte: null,
        relacoes: [
          {
            relacao: "DEFINE",
            peso: 1.0,
            alvo: {
              tipoNode: "CONCEITO",
              nome: "Máquina de Vetores de Suporte",
              descricao: null,
              // conceito → tópico → assunto (obrigatório)
              topico: {
                nome: "Aprendizado supervisionado",
                descricao: null,
                assunto: { nome: "Machine Learning", descricao: null },
              },
            },
          },
          {
            relacao: "PERTENCE_A",
            peso: 0.6,
            alvo: {
              tipoNode: "TOPICO",
              nome: "Aprendizado supervisionado",
              descricao: null,
              // tópico → assunto (obrigatório)
              assunto: { nome: "Machine Learning", descricao: null },
            },
          },
        ],
        flashcards: [
          {
            pergunta: "O que a SVM maximiza ao separar classes?",
            resposta: "A margem — a distância do hiperplano aos pontos mais próximos (vetores de suporte).",
          },
        ],
      },
      {
        titulo: "Kernel trick (anotação de leitura)",
        conteudo: "Mapeia os dados para um espaço de maior dimensão sem calculá-lo explicitamente.",
        tipoNota: "LITERATURA",
        subtipo: "EXPLICACAO",
        fonte: "Bishop, Pattern Recognition, cap. 6",
        relacoes: [
          {
            relacao: "APROFUNDA",
            peso: 0.8,
            alvo: {
              tipoNode: "CONCEITO",
              nome: "Kernel",
              descricao: null,
              topico: {
                nome: "Aprendizado supervisionado",
                descricao: null,
                assunto: { nome: "Machine Learning", descricao: null },
              },
            },
          },
        ],
        flashcards: [
          {
            pergunta: "Para que serve o kernel trick?",
            resposta: "Permite operar num espaço de maior dimensão sem computá-lo explicitamente.",
          },
        ],
      },
    ],
  },
  null,
  2
);

interface AssuntoRef {
  nome: string;
  descricao: string | null;
}
interface TopicoRef {
  nome: string;
  descricao: string | null;
  assunto: AssuntoRef; // obrigatório: todo tópico pertence a um assunto
}
interface RelacaoJsonPayload {
  relacao: string;
  peso: number;
  alvo: {
    tipoNode: (typeof NOTA_RELATABLE_TYPES)[number];
    nome: string;
    descricao: string | null;
    // hierarquia obrigatória: conceito → tópico → assunto
    topico?: TopicoRef; // obrigatório quando tipoNode === "CONCEITO"
    assunto?: AssuntoRef; // obrigatório quando tipoNode === "TOPICO"
  };
}

interface FlashcardJsonPayload {
  pergunta: string;
  resposta: string;
}

interface NotaJsonPayload {
  titulo: string;
  conteudo: string;
  tipoNota: string;
  subtipo: string;
  fonte: string | null;
  relacoes: RelacaoJsonPayload[];
  flashcards: FlashcardJsonPayload[];
}

// Valida os flashcards aninhados de uma nota. Cada flashcard testa esta nota
// (relação TESTA) e herda os conceitos a que a nota se liga (relação HERDA).
function parseFlashcards(value: unknown, pos: string): FlashcardJsonPayload[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`"flashcards" deve ser um array${pos}.`);
  }
  if (value.length > IMPORT_LIMITS.flashcardsPorNota) {
    throw new Error(`Máximo de ${IMPORT_LIMITS.flashcardsPorNota} flashcards por nota${pos}.`);
  }

  return value.map((fc, k) => {
    const fpos = `${pos} flashcard #${k + 1}`;
    if (typeof fc !== "object" || fc === null) {
      throw new Error(`Cada flashcard deve ser um objeto JSON (${fpos.trim()}).`);
    }
    const obj = fc as Record<string, unknown>;
    const pergunta = readStr(obj.pergunta, "pergunta", IMPORT_LIMITS.pergunta, ` (${fpos.trim()})`);
    if (!pergunta) throw new Error(`"pergunta" é obrigatória (${fpos.trim()}).`);
    const resposta = readStr(obj.resposta, "resposta", IMPORT_LIMITS.resposta, ` (${fpos.trim()})`);
    if (!resposta) throw new Error(`"resposta" é obrigatória (${fpos.trim()}).`);
    return { pergunta, resposta };
  });
}

interface TextoOriginalPayload {
  titulo: string;
  texto: string;
}

interface ImportJsonResult {
  // texto original (fonte); quando presente, vira um nó TEXTO_BRUTO ligado às notas por GERA
  textoOriginal: TextoOriginalPayload | null;
  notas: NotaJsonPayload[];
}

// Valida o bloco "textoBruto" (texto fonte) quando fornecido.
function parseTextoOriginal(value: unknown): TextoOriginalPayload | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error('"textoBruto" deve ser um objeto { titulo, texto }.');
  }
  const obj = value as Record<string, unknown>;
  const texto = readStr(obj.texto, "textoBruto.texto", IMPORT_LIMITS.texto, "");
  if (!texto) throw new Error('"textoBruto.texto" é obrigatório quando "textoBruto" é fornecido.');
  const titulo = readStr(obj.titulo, "textoBruto.titulo", IMPORT_LIMITS.titulo, "");
  return { titulo: titulo || "Texto sem título", texto };
}

// Valida a referência a um assunto ({ nome, descricao }).
function parseAssuntoRef(value: unknown, ctx: string): AssuntoRef {
  if (typeof value !== "object" || value === null) {
    throw new Error(`"assunto" é obrigatório e deve ser um objeto { nome } (${ctx}).`);
  }
  const obj = value as Record<string, unknown>;
  const nome = readStr(obj.nome, "assunto.nome", IMPORT_LIMITS.nome, ` (${ctx})`);
  if (!nome) throw new Error(`"assunto.nome" é obrigatório (${ctx}).`);
  const descricao = readStr(obj.descricao, "assunto.descricao", IMPORT_LIMITS.descricao, ` (${ctx})`);
  return { nome, descricao: descricao || null };
}

// Valida a referência a um tópico, que por sua vez exige um assunto.
function parseTopicoRef(value: unknown, ctx: string): TopicoRef {
  if (typeof value !== "object" || value === null) {
    throw new Error(`"topico" é obrigatório e deve ser um objeto { nome, assunto } (${ctx}).`);
  }
  const obj = value as Record<string, unknown>;
  const nome = readStr(obj.nome, "topico.nome", IMPORT_LIMITS.nome, ` (${ctx})`);
  if (!nome) throw new Error(`"topico.nome" é obrigatório (${ctx}).`);
  const descricao = readStr(obj.descricao, "topico.descricao", IMPORT_LIMITS.descricao, ` (${ctx})`);
  const assunto = parseAssuntoRef(obj.assunto, `${ctx} → topico "${nome}"`);
  return { nome, descricao: descricao || null, assunto };
}

// Valida as relações de uma nota: cada alvo deve ser um tipo ligável e a relação
// precisa ser permitida entre NOTA e o tipo do alvo (mesmas regras da legenda do grafo).
// Hierarquia obrigatória: conceito pertence a um tópico, e tópico pertence a um assunto.
function parseRelacoes(value: unknown, pos: string): RelacaoJsonPayload[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(`"relacoes" deve ser um array${pos}.`);
  }
  if (value.length > IMPORT_LIMITS.relacoesPorNota) {
    throw new Error(`Máximo de ${IMPORT_LIMITS.relacoesPorNota} relações por nota${pos}.`);
  }

  return value.map((rel, j) => {
    const rpos = `${pos} relação #${j + 1}`;
    if (typeof rel !== "object" || rel === null) {
      throw new Error(`Cada relação deve ser um objeto JSON (${rpos.trim()}).`);
    }
    const robj = rel as Record<string, unknown>;
    const alvo = robj.alvo;
    if (typeof alvo !== "object" || alvo === null) {
      throw new Error(`A relação precisa de um "alvo" (${rpos.trim()}).`);
    }
    const aobj = alvo as Record<string, unknown>;

    const tipoNode = typeof aobj.tipoNode === "string" ? aobj.tipoNode : "";
    if (!NOTA_RELATABLE_TYPES.includes(tipoNode as (typeof NOTA_RELATABLE_TYPES)[number])) {
      throw new Error(
        `"alvo.tipoNode" inválido (${rpos.trim()}). Uma nota só liga a: ${NOTA_RELATABLE_TYPES.join(", ")}.`
      );
    }

    const nome = readStr(aobj.nome, "alvo.nome", IMPORT_LIMITS.nome, ` (${rpos.trim()})`);
    if (!nome) throw new Error(`"alvo.nome" é obrigatório (${rpos.trim()}).`);

    const relacao = typeof robj.relacao === "string" ? robj.relacao : "";
    if (!isRelationAllowed("NOTA", tipoNode, relacao)) {
      const allowed = getAllowedRelations("NOTA", tipoNode);
      throw new Error(
        `Relação "${relacao || "(vazia)"}" não é permitida entre NOTA e ${tipoNode} (${rpos.trim()}). Permitidas: ${allowed.join(", ")}.`
      );
    }

    // peso (força da relação) — opcional, número em 0..2, padrão 1.0
    let peso = 1.0;
    if (robj.peso !== undefined && robj.peso !== null) {
      if (typeof robj.peso !== "number" || !Number.isFinite(robj.peso) || robj.peso <= 0 || robj.peso > 2) {
        throw new Error(`"peso" deve ser um número entre 0 e 2 (${rpos.trim()}).`);
      }
      peso = robj.peso;
    }

    const descricao = readStr(aobj.descricao, "alvo.descricao", IMPORT_LIMITS.descricao, ` (${rpos.trim()})`);

    // hierarquia obrigatória conforme o tipo do alvo
    let topico: TopicoRef | undefined;
    let assunto: AssuntoRef | undefined;
    if (tipoNode === "CONCEITO") {
      topico = parseTopicoRef(aobj.topico, `${rpos.trim()} → conceito "${nome}"`);
    } else if (tipoNode === "TOPICO") {
      assunto = parseAssuntoRef(aobj.assunto, `${rpos.trim()} → tópico "${nome}"`);
    }

    return {
      relacao,
      peso,
      alvo: {
        tipoNode: tipoNode as (typeof NOTA_RELATABLE_TYPES)[number],
        nome,
        descricao: descricao || null,
        topico,
        assunto,
      },
    };
  });
}

// Valida e normaliza uma única nota do JSON.
function parseOneNota(item: unknown, pos: string): NotaJsonPayload {
  if (typeof item !== "object" || item === null) {
    throw new Error(`Cada nota deve ser um objeto JSON${pos}.`);
  }
  const obj = item as Record<string, unknown>;

  const titulo = readStr(obj.titulo, "titulo", IMPORT_LIMITS.titulo, pos);
  if (!titulo) throw new Error(`O campo "titulo" é obrigatório${pos}.`);

  const conteudo = readStr(obj.conteudo, "conteudo", IMPORT_LIMITS.conteudo, pos);
  if (!conteudo) throw new Error(`O campo "conteudo" é obrigatório${pos}.`);

  const tipoNota = typeof obj.tipoNota === "string" ? obj.tipoNota : "PERMANENTE";
  if (!NOTA_TIPOS.includes(tipoNota as (typeof NOTA_TIPOS)[number])) {
    throw new Error(`"tipoNota" inválido${pos}. Use: ${NOTA_TIPOS.join(", ")}.`);
  }

  const subtipo = typeof obj.subtipo === "string" ? obj.subtipo : "";
  if (!NOTA_SUBTIPOS.includes(subtipo as (typeof NOTA_SUBTIPOS)[number])) {
    throw new Error(`"subtipo" inválido${pos}. Use: ${NOTA_SUBTIPOS.join(", ")}.`);
  }

  const fonteRaw = readStr(obj.fonte, "fonte", IMPORT_LIMITS.fonte, pos);
  if (tipoNota === "LITERATURA" && !fonteRaw) {
    throw new Error(`Notas de referência (LITERATURA) exigem "fonte"${pos}.`);
  }

  const relacoes = parseRelacoes(obj.relacoes, pos);
  const flashcards = parseFlashcards(obj.flashcards, pos);

  return { titulo, conteudo, tipoNota, subtipo, fonte: fonteRaw || null, relacoes, flashcards };
}

// Valida o JSON colado. Aceita:
//  - objeto { textoBruto?: {titulo,texto}, notas: [...] }  (recomendado)
//  - array de notas  /  uma única nota                     (sem texto fonte)
function parseImportJson(raw: string): ImportJsonResult {
  if (raw.length > IMPORT_LIMITS.raw) {
    throw new Error("JSON muito grande. Reduza o conteúdo ou importe em partes.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JSON inválido — verifique a sintaxe (vírgulas, aspas, chaves).");
  }

  let notasRaw: unknown[];
  let textoOriginal: TextoOriginalPayload | null = null;

  if (Array.isArray(parsed)) {
    notasRaw = parsed;
  } else if (parsed && typeof parsed === "object" && "notas" in (parsed as object)) {
    const root = parsed as Record<string, unknown>;
    if (!Array.isArray(root.notas)) throw new Error('"notas" deve ser um array.');
    notasRaw = root.notas;
    textoOriginal = parseTextoOriginal(root.textoBruto);
  } else {
    notasRaw = [parsed];
  }

  if (notasRaw.length === 0) throw new Error("Forneça ao menos uma nota.");
  if (notasRaw.length > IMPORT_LIMITS.notas) {
    throw new Error(`Máximo de ${IMPORT_LIMITS.notas} notas por importação.`);
  }

  const notas = notasRaw.map((item, idx) =>
    parseOneNota(item, notasRaw.length > 1 ? ` (nota #${idx + 1})` : "")
  );

  return { textoOriginal, notas };
}

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
  const [activeTab, setActiveTab] = useState<"create" | "existing" | "json">("create");
  const [selectedType, setSelectedType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  // opções da importação JSON — o usuário decide se guarda o texto fonte e se gera flashcards
  const [jsonGuardarTexto, setJsonGuardarTexto] = useState(true);
  const [jsonGerarFlashcards, setJsonGerarFlashcards] = useState(true);
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
      setAvailableItems(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro desconhecido";
      console.error("Erro ao carregar itens disponíveis:", e);
      toast.error(`Erro ao carregar itens disponíveis: ${message}`);
    }
  };

  const resetForm = () => {
    setSelectedType("");
    setAiSuggestions([]);
    setSelectedItems(new Set());
    setSearchQuery("");
    setJsonInput("");
    setJsonGuardarTexto(true);
    setJsonGerarFlashcards(true);
    setDeckSelected(new Set());
    setDeckSearch("");
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
    if (activeTab === "json") {
      let parsed: ImportJsonResult;
      try {
        parsed = parseImportJson(jsonInput);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "JSON inválido");
        return;
      }
      // aplica as opções do usuário: omitir texto fonte e/ou flashcards
      const textoOriginal = jsonGuardarTexto ? parsed.textoOriginal : null;
      const notas = jsonGerarFlashcards
        ? parsed.notas
        : parsed.notas.map((n) => ({ ...n, flashcards: [] }));

      setLoading(true);
      try {
        // importação atômica em uma única requisição (transação no servidor):
        // ou cria tudo, ou nada — sem importação parcial.
        const r = await importGraphNotas(grafoId, { textoOriginal, notas });

        const notaMsg = r.notas === 1 ? "1 nota" : `${r.notas} notas`;
        const fonteMsg = r.textoBruto ? "texto fonte, " : "";
        const fcMsg = r.flashcards > 0 ? `, ${r.flashcards} flashcard(s)` : "";
        toast.success(
          r.edges > 0
            ? `${fonteMsg}${notaMsg}${fcMsg} e ${r.edges} relação(ões) criadas via JSON!`
            : `${fonteMsg}${notaMsg} criada(s) via JSON!`
        );
        resetForm();
        onOpenChange(false);
        if (onSuccess) onSuccess();
        router.refresh();
      } catch (e) {
        // transação revertida — nada foi criado
        toast.error(e instanceof Error ? e.message : "Erro ao importar notas");
      } finally {
        setLoading(false);
      }
      return;
    }

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

        // relações sugeridas pela IA e aceitas pelo usuário (nota como origem)
        const accepted = selectedType === "NOTA" ? aiSuggestions.filter((sg) => sg.accepted) : [];
        let createdEdges = 0;
        for (const sg of accepted) {
          try {
            const edgeRes = await fetch("/api/graph/edge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                grafoId,
                sourceNodeId: data.nodeId,
                targetNodeId: sg.nodeId,
                tipoRelacao: sg.relacao,
                peso: 1.0,
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
      <DialogContent className="max-w-2xl flex max-h-[85vh] flex-col gap-0">
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
          <button
            onClick={() => setActiveTab("json")}
            className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
              activeTab === "json"
                ? "border-b-2 border-primary text-primary"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Via JSON
          </button>
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

          {/* JSON TAB: paste a nota (or array of notas) as JSON */}
          {activeTab === "json" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="json-input">Texto fonte e notas em JSON</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setJsonInput(JSON_EXEMPLO)}
                >
                  Carregar exemplo
                </Button>
              </div>
              <Textarea
                id="json-input"
                spellCheck={false}
                placeholder='{ "textoBruto": { "titulo": "...", "texto": "..." }, "notas": [ { "titulo": "...", "conteudo": "...", "tipoNota": "PERMANENTE", "subtipo": "DEFINICAO", "fonte": null } ] }'
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={9}
                className="font-mono text-xs"
              />

              {/* Opções: o usuário decide o que importar do JSON */}
              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={jsonGuardarTexto}
                    onChange={(e) => setJsonGuardarTexto(e.target.checked)}
                  />
                  Guardar texto fonte (nó <strong>Texto bruto</strong>)
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={jsonGerarFlashcards}
                    onChange={(e) => setJsonGerarFlashcards(e.target.checked)}
                  />
                  Gerar flashcards
                </label>
              </div>
              <details className="rounded-md border border-zinc-200 dark:border-zinc-800 text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none px-2.5 py-2 font-medium text-foreground">
                  Formato e regras do JSON
                </summary>
                <div className="space-y-1 px-2.5 pb-2.5">
                <p>
                  Cole <code>{"{ textoBruto, notas }"}</code> (ou um array de notas). Campos:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>
                    <code>textoBruto</code> (opcional): <code>{"{ titulo, texto }"}</code> — o texto
                    original vira um nó <strong>Texto bruto</strong> que <em>gera</em> as notas
                  </li>
                  <li><code>titulo</code> e <code>conteudo</code> da nota — obrigatórios</li>
                  <li><code>tipoNota</code>: {NOTA_TIPOS.join(", ")} (padrão PERMANENTE)</li>
                  <li><code>subtipo</code>: {NOTA_SUBTIPOS.join(", ")}</li>
                  <li><code>fonte</code>: obrigatória quando <code>tipoNota</code> é LITERATURA</li>
                </ul>
                <p className="pt-1">
                  <code>relacoes</code> (opcional): cria nós ligados à nota. Cada item tem
                  {" "}<code>relacao</code>, <code>peso</code> (0–2, força — padrão 1.0) e
                  {" "}<code>alvo</code> (<code>{"{ tipoNode, nome, descricao }"}</code>).
                  Uma nota só liga a <strong>CONCEITO</strong>, <strong>TOPICO</strong> ou <strong>ASSUNTO</strong>,
                  respeitando a legenda:
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>NOTA → CONCEITO: {getAllowedRelations("NOTA", "CONCEITO").join(", ")}</li>
                  <li>NOTA → TOPICO: {getAllowedRelations("NOTA", "TOPICO").join(", ")}</li>
                  <li>NOTA → ASSUNTO: {getAllowedRelations("NOTA", "ASSUNTO").join(", ")}</li>
                </ul>
                <p className="pt-1">
                  <strong>Hierarquia obrigatória:</strong> todo <strong>CONCEITO</strong> exige
                  {" "}<code>topico</code> (<code>{"{ nome, assunto: { nome } }"}</code>) e todo
                  {" "}<strong>TOPICO</strong> exige <code>assunto</code> (<code>{"{ nome }"}</code>).
                  O app cria as relações <em>pertence a</em> conceito→tópico→assunto automaticamente.
                </p>
                <p className="pt-1">
                  <code>flashcards</code> (opcional): lista de <code>{"{ pergunta, resposta }"}</code>
                  {" "}dentro de cada nota. Cada flashcard <strong>testa</strong> aquela nota e
                  {" "}<strong>herda</strong> os conceitos a que ela se liga. Um flashcard pertence
                  {" "}a uma única nota.
                </p>
                <p className="pt-1 italic">
                  As opções acima ignoram o texto fonte e/ou os flashcards mesmo que estejam no JSON.
                </p>
                </div>
              </details>
            </div>
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
                  : activeTab === "json"
                  ? "Importar JSON"
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
