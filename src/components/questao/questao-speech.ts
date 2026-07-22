// Definido aqui (módulo-folha) e re-exportado por QuestaoFace, para evitar ciclo
// entre os dois arquivos.
export interface QuestaoAlternativa {
  letra: string;
  texto: string;
}

// Monta o texto falado da questão. Em múltipla escolha, o enunciado sozinho é
// incompleto — inclui as alternativas ("A: ...", "B: ...") para o aluno ouvir e
// pensar. NÃO inclui o gabarito (não estraga a resposta). O markdown é removido
// depois, na hora de falar (useSpeech), então aqui só concatena.
export function questionSpeechText(
  enunciado: string,
  tipo: string,
  alternativas: QuestaoAlternativa[] | null,
): string {
  if (tipo === "MULTIPLA_ESCOLHA" && alternativas?.length) {
    const opcoes = alternativas.map((alt) => `${alt.letra}: ${alt.texto}`).join(". ");
    return `${enunciado}. ${opcoes}`;
  }
  return enunciado;
}
