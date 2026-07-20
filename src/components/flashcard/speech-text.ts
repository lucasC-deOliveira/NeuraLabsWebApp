// Prepara o texto do flashcard para a fala: tira a sintaxe de markdown (o TTS não
// deve ler "asterisco", "cerquilha") e chuta o idioma, já que o acervo mistura
// português, inglês e japonês — ler japonês com voz pt-BR é ininteligível.
// Lógica pura, testável.

// Kana + CJK unificado: se aparecem, é japonês.
const JAPANESE = /[぀-ヿ㐀-䶿一-鿿]/;
// Diacríticos comuns do português — bom sinal de que NÃO é inglês.
const PT_DIACRITICS = /[ãâáàçéêíóôõúü]/i;
// Palavras funcionais do inglês, como pistas quando não há diacríticos.
const EN_STOPWORDS = /\b(the|is|are|of|and|to|a|an|in|for|with|how|what|why)\b/i;

/** Remove a marcação markdown, deixando só o texto que deve ser falado. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ") // blocos de código
    .replace(/`([^`]+)`/g, "$1") // código inline
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // links/imagens → o texto
    .replace(/[*_~]/g, "") // ênfase inline: sem espaço, "**x**?" → "x?"
    .replace(/[#>]/g, " ") // título/citação são de linha: podem virar espaço
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chuta o idioma (BCP-47) do texto para escolher a voz.
 * @example guessSpeechLang("What is a stack?") // "en-US"
 */
export function guessSpeechLang(text: string): string {
  if (JAPANESE.test(text)) return "ja-JP";
  if (PT_DIACRITICS.test(text)) return "pt-BR";
  // Sem diacrítico e com cara de inglês (ex.: "Binary Search"): usa voz inglesa.
  if (EN_STOPWORDS.test(text) || isLikelyEnglishTerm(text)) return "en-US";
  return "pt-BR";
}

// Termo curto ASCII sem palavra de função pt: provável termo técnico em inglês
// ("Quick Sort", "LRU Cache"). Português sem acento existe, mas costuma trazer
// "de/que/uma/não" — a ausência delas inclina para o inglês.
function isLikelyEnglishTerm(text: string): boolean {
  const ascii = /^[\x00-\x7f]+$/.test(text);
  const hasLetters = /[a-z]/i.test(text);
  const hasPtFunctionWord = /\b(de|que|uma|um|não|com|para|dos|das|é|se)\b/i.test(text);
  return ascii && hasLetters && !hasPtFunctionWord && text.trim().split(/\s+/).length <= 4;
}
