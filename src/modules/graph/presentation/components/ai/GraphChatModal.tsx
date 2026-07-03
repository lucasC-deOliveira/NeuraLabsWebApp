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
import { MarkdownContent } from "@/components/markdown-content";
import { graphHttp } from "@/modules/graph/infra/http";
import type { ChatReferencedNode } from "@/modules/graph/application/ports/graph-ai.port";

interface GraphChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grafoId: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  referencedNodes?: ChatReferencedNode[];
}

const TYPE_LABEL: Record<string, string> = { ASSUNTO: "Assunto", TOPICO: "Tópico", CONCEITO: "Conceito", NOTA: "Nota" };

export function GraphChatModal({ open, onOpenChange, grafoId }: GraphChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Limpa a conversa ao fechar (durante render, não em effect).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) { setMessages([]); setInput(""); setLoading(false); }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await graphHttp.chatWithGraph(grafoId, question, history);
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer, referencedNodes: res.referencedNodes }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Erro: ${err instanceof Error ? err.message : "Falha na requisição."}` }]);
    } finally {
      setLoading(false);
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

        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground text-center max-w-xs">Faça uma pergunta sobre o conteúdo do seu grafo...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pensando...</span>
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

function ChatBubble({ message: msg }: { message: ChatMessage }) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${msg.role === "user" ? "max-w-[80%]" : ""}`}>
        <div className={`rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          {msg.role === "user" ? <p className="whitespace-pre-wrap">{msg.content}</p> : <MarkdownContent>{msg.content}</MarkdownContent>}
        </div>
        {msg.role === "assistant" && msg.referencedNodes && msg.referencedNodes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {msg.referencedNodes.map((n) => (
              <span key={n.id} className="text-[10px] bg-muted/60 border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                🔗 {TYPE_LABEL[n.tipo] ?? n.tipo}: {n.nome}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
