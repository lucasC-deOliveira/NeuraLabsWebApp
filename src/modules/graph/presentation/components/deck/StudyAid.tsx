import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2Icon, LightbulbIcon, BrainIcon } from "lucide-react";
import { graphHttp } from "@/modules/graph/infra/http";
import type { StudyAidMode } from "@/modules/graph/application/ports/study.port";
import { useSpeech, type SpeechControls } from "@/components/speech/useSpeech";
import { SpeakButton } from "@/components/speech/SpeakButton";

interface StudyAidProps {
  mode: StudyAidMode;
  card: { pergunta: string; resposta: string; conceito: string | null };
  // Controle de fala compartilhado pela sessão (coordena com a leitura do card).
  speech?: SpeechControls;
}

// Dica socrática (na pergunta) ou mnemônico (na resposta), sob demanda. Custa
// tokens, então nunca dispara sozinho — só quando o aluno pede. O texto vive no
// próprio componente: é ajuda efêmera, não faz parte do card.
export function StudyAid({ mode, card, speech: sharedSpeech }: StudyAidProps) {
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(false);
  const ownSpeech = useSpeech();
  const speech = sharedSpeech ?? ownSpeech;

  const pedir = async (): Promise<void> => {
    setLoading(true);
    setErro(false);
    try {
      const res = await graphHttp.generateStudyAid(mode, card);
      // Modelo pode responder vazio (ver parseStudyAid): trata como falha suave.
      if (res.texto) setTexto(res.texto);
      else setErro(true);
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
  };

  if (texto) return <AidText mode={mode} texto={texto} speech={speech} />;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full gap-2 text-muted-foreground"
      onClick={pedir}
      disabled={loading}
    >
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : <AidIcon mode={mode} />}
      {erro ? "Não veio nada — tentar de novo" : promptLabel(mode)}
    </Button>
  );
}

function AidText({ mode, texto, speech }: { mode: StudyAidMode; texto: string; speech: SpeechControls }) {
  const tint = mode === "hint" ? "border-amber-500/40 bg-amber-500/5" : "border-violet-500/40 bg-violet-500/5";
  const label = mode === "hint" ? "a dica" : "o mnemônico";
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${tint}`}>
      <AidIcon mode={mode} />
      <span className="flex-1 leading-relaxed">{texto}</span>
      <SpeakButton speech={speech} id={`aid-${mode}`} text={texto} label={label} className="-my-1" />
    </div>
  );
}

function AidIcon({ mode }: { mode: StudyAidMode }) {
  return mode === "hint" ? (
    <LightbulbIcon className="size-4 shrink-0 text-amber-500" />
  ) : (
    <BrainIcon className="size-4 shrink-0 text-violet-500" />
  );
}

function promptLabel(mode: StudyAidMode): string {
  return mode === "hint" ? "Preciso de uma dica (sem a resposta)" : "Criar um mnemônico pra fixar";
}
