import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, MessageCircleIcon, SendIcon } from "lucide-react";
import { useSpeech, type SpeechControls } from "@/components/speech/useSpeech";
import { SpeakButton } from "@/components/speech/SpeakButton";
import { SpokenText } from "@/components/speech/SpokenText";
import { graphHttp } from "@/modules/graph/infra/http";
import type { ChatReferencedNode } from "@/modules/graph/application/ports/graph-ai.port";
import type { VaultChatAnswer, VaultChatPort, VaultChatScope } from "../../../application/ports/vault-chat.port";
import type { VaultChatFilter } from "../../../domain/services/vault-chat-search";
import { askVaultChat } from "../../../application/ask-vault-chat";
import { Link } from "@/components/link";

interface GraphChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
  vault?: VaultChatPort;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  referencedNodes?: ChatReferencedNode[];
  vaultAnswer?: VaultChatAnswer;
}

const TYPE_LABEL: Record<string, string> = { ASSUNTO: "Assunto", TOPICO: "Tópico", CONCEITO: "Conceito", NOTA: "Nota" };

export function GraphChatModal({ open, onOpenChange, grafoId, vault }: GraphChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const [scope, setScope] = useState<VaultChatScope>("graph");
  const [filter, setFilter] = useState<VaultChatFilter>("all");
  const bottomRef = useRef<HTMLDivElement>(null);
  const requestGeneration = useRef(0);
  const speech = useSpeech();

  // Limpa a conversa ao fechar (durante render, não em effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) { setMessages([]); setInput(""); setLoading(false); setScope("graph"); setFilter("all"); }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => () => { requestGeneration.current += 1; }, [open, grafoId]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    const request = ++requestGeneration.current;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const result = vault ? await askVaultChat(vault, { scope, filter, question, history })
        : await graphHttp.chatWithGraph(grafoId, question, history);
      const message: ChatMessage = "citations" in result
        ? { role: "assistant", content: result.answer, vaultAnswer: result }
        : { role: "assistant", content: result.answer, referencedNodes: result.referencedNodes };
      if (request === requestGeneration.current) setMessages((prev) => [...prev, message]);
    } catch (err) {
      if (request === requestGeneration.current) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Erro: ${err instanceof Error ? err.message : "Falha na requisição."}` }]);
      }
    } finally {
      if (request === requestGeneration.current) setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl h-[600px] flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircleIcon className="size-4 text-primary" />
            Chat com o grafo
          </DialogTitle>
          <DialogDescription>Pergunte sobre o conteúdo do seu grafo de conhecimento.</DialogDescription>
        </DialogHeader>
        {vault && <VaultChatControls scope={scope} filter={filter} disabled={loading} onScope={setScope} onFilter={setFilter} />}

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground text-center max-w-xs">Faça uma pergunta sobre o conteúdo do seu grafo...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} index={i} speech={speech} onNavigate={() => onOpenChange(false)} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{vault ? "Buscando no vault e preparando a resposta…" : "Pensando..."}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <Separator className="shrink-0" />
        <form onSubmit={send} className="shrink-0 flex gap-2 p-3">
          <input
            className="flex-1 text-sm bg-muted/40 border border-border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 placeholder:text-muted-foreground"
            placeholder="Pergunte algo sobre seu grafo..."
            value={input}
            maxLength={vault ? 2000 : undefined}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChatBubble({ message: msg, index, speech, onNavigate }: {
  message: ChatMessage; index: number; speech: SpeechControls; onNavigate: () => void;
}) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${msg.role === "user" ? "max-w-[80%]" : ""}`}>
        <div className={`rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          {msg.role === "user" ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <SpokenText speech={speech} id={`chat-${index}`} text={msg.content} />
          )}
        </div>
        {msg.role === "assistant" && (
          <div className="mt-0.5 px-1">
            <SpeakButton speech={speech} id={`chat-${index}`} text={msg.content} label="a resposta" />
          </div>
        )}
        {msg.role === "assistant" && msg.referencedNodes && msg.referencedNodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {msg.referencedNodes.map((n) => (
              <span key={n.id} className="text-[10px] bg-muted/60 border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                🔗 {TYPE_LABEL[n.tipo] ?? n.tipo}: {n.nome}
              </span>
            ))}
          </div>
        )}
        {msg.vaultAnswer && <VaultChatCitations answer={msg.vaultAnswer} onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

const filters: Array<{ value: VaultChatFilter; label: string }> = [
  { value: "all", label: "Todos os tipos" }, { value: "NOTA", label: "Todas as notas" },
  { value: "PERMANENTE", label: "Notas permanentes" }, { value: "LITERATURA", label: "Notas de literatura" },
  { value: "PASSAGEIRA", label: "Notas passageiras" }, { value: "ESTRUTURA", label: "Notas de estrutura" },
  { value: "CONCEITO", label: "Conceitos" }, { value: "FLASHCARD", label: "Flashcards" },
  { value: "QUESTION", label: "Questões" }, { value: "PROVA", label: "Provas" },
];

function VaultChatControls({ scope, filter, disabled, onScope, onFilter }: {
  scope: VaultChatScope; filter: VaultChatFilter; disabled: boolean;
  onScope: (scope: VaultChatScope) => void; onFilter: (filter: VaultChatFilter) => void;
}) {
  return (
    <div className="shrink-0 space-y-2 border-b pb-3 text-xs">
      <div className="flex flex-wrap gap-2">
        <select aria-label="Onde buscar" className="rounded-md border bg-background p-1.5" disabled={disabled} value={scope}
          onChange={(event) => onScope(event.target.value === "vault" ? "vault" : "graph")}>
          <option value="graph">Este grafo</option><option value="vault">Todo o vault</option>
        </select>
        <select aria-label="Tipo de conteúdo" className="rounded-md border bg-background p-1.5" disabled={disabled} value={filter}
          onChange={(event) => onFilter(event.target.value as VaultChatFilter)}>
          {filters.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <p className="text-muted-foreground">A busca é local. Ao enviar, os trechos selecionados e a conversa seguem para a IA configurada no servidor.</p>
    </div>
  );
}

function VaultChatCitations({ answer, onNavigate }: { answer: VaultChatAnswer; onNavigate: () => void }) {
  if (!answer.citations.length) return null;
  return (
    <div className="mt-2 space-y-1 text-xs">
      <p className="font-medium">{answer.localOnly ? "Trechos encontrados" : "Fontes citadas do vault"}</p>
      {answer.citations.map(({ id, graphId, nome, excerpt }) => (
        <details key={id} className="rounded-md border px-2 py-1.5">
          <summary className="cursor-pointer">{nome}</summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{excerpt}</p>
          {graphId && <Link href={`/graph/${encodeURIComponent(graphId)}?focus=${encodeURIComponent(id)}`}
            onClick={onNavigate} className="mt-2 inline-block text-primary underline">Ver no grafo</Link>}
          <code className="mt-1 block break-all text-muted-foreground">{`[[${id}]]`}</code>
        </details>
      ))}
    </div>
  );
}
