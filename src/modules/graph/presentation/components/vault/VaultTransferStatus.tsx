import type { VaultTransferProgress } from "@/lib/vault-sync";

export type VaultTransferFeedback =
  | { kind: "running"; progress: VaultTransferProgress }
  | { kind: "done"; message: string }
  | { kind: "error"; progress: VaultTransferProgress; message: string };

function stageDescription(progress: VaultTransferProgress): { title: string; detail: string } {
  switch (progress.phase) {
    case "reading-vault":
      return { title: "Preparando o envio", detail: "Lendo os arquivos do grafo no vault." };
    case "checking-relations":
      return { title: "Verificando relações compartilhadas", detail: "Comparando as relações deste grafo com as outras cópias no vault." };
    case "registering":
      return { title: "Registrando o grafo", detail: "Aguardando o servidor vincular o grafo a Meu Conhecimento." };
    case "sending":
      return {
        title: "Aguardando a gravação no servidor",
        detail: `O envio contém ${progress.nodes} nó(s) e ${progress.edges} relação(ões). O servidor ainda está processando a solicitação.`,
      };
    case "confirming":
      return { title: "Confirmando a publicação", detail: "Conferindo o vínculo com Meu Conhecimento e atualizando o manifesto local." };
    case "checking-reviews":
      return { title: "Verificando revisões locais", detail: "O servidor já confirmou o conteúdo do grafo." };
    case "downloading":
      return { title: "Baixando o grafo", detail: "Aguardando o servidor enviar os nós e as relações." };
    case "writing-vault":
      return { title: "Gravando no vault", detail: `Salvando ${progress.files} arquivo(s) na pasta local.` };
  }
}

export function VaultTransferStatus({ feedback }: { feedback: VaultTransferFeedback }) {
  if (feedback.kind === "done") return <p role="status" className="text-sm font-medium">{feedback.message}</p>;
  const stage = stageDescription(feedback.progress);
  if (feedback.kind === "error") {
    return (
      <div role="alert" className="space-y-1 text-sm">
        <p className="font-medium text-destructive">Falha na etapa “{stage.title}”</p>
        <p>{feedback.message}</p>
      </div>
    );
  }
  return (
    <div role="status" className="space-y-1 text-sm">
      <p className="font-medium">{stage.title}</p>
      <p className="text-muted-foreground">{stage.detail}</p>
    </div>
  );
}
