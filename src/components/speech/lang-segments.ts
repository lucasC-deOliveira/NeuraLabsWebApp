// Termos técnicos/estrangeiros que devem soar em INGLÊS mesmo no meio de uma frase
// em português (app de Ciência da Computação). Ex.: "heap como funciona" → "heap"
// em inglês, "como funciona" em português. Alta precisão: só palavras que NÃO são
// também palavras comuns do português (evita falso positivo — por isso nada de
// "o", "a", "de"...). Extensível: acrescente termos aqui. Comparação por palavra
// inteira, sem distinção de maiúsculas.
const EN_TERMS = new Set<string>([
  // estruturas de dados
  "heap", "stack", "queue", "deque", "array", "hash", "hashmap", "hashset",
  "hashtable", "linkedlist", "trie", "tree", "bitmap", "bitset", "tuple",
  "node", "graph", "edge", "vertex", "root", "leaf",
  // algoritmos / conceitos
  "quicksort", "mergesort", "heapsort", "bubblesort", "binary", "search",
  "sort", "merge", "hashing", "backtracking", "greedy", "recursion",
  "runtime", "overhead", "throughput", "latency", "overflow", "underflow",
  "deadlock", "livelock", "benchmark",
  // programação / sistemas
  "thread", "mutex", "semaphore", "lock", "buffer", "cache", "pointer",
  "pipeline", "framework", "middleware", "backend", "frontend", "kernel",
  "compiler", "linker", "callback", "closure", "promise", "async", "await",
  "software", "hardware", "firmware", "garbage", "collector", "scheduler",
  "deploy", "build", "release", "commit", "branch", "rollback", "container",
  // siglas comuns (lidas em inglês)
  "cpu", "gpu", "ram", "rom", "ssd", "api", "sdk", "url", "http", "https",
  "json", "html", "css", "sql", "tcp", "udp", "dns", "lru", "lfu", "fifo", "lifo",
]);

export function isEnglishTerm(word: string): boolean {
  return EN_TERMS.has(word.toLowerCase());
}

export interface LangSegment {
  text: string;
  lang: string; // BCP-47, ex.: "en-US" | "pt-BR" | "ja-JP"
}

// Kana + CJK: se aparecem, é japonês.
const JAPANESE = /[぀-ヿ㐀-䶿一-鿿]/;
// Stopwords inglesas SEM colisão com palavras do português (nada de "a", "do",
// "no", "e"...): um sinal forte de que a frase-base é inglês.
const EN_STOPWORDS =
  /\b(the|is|are|was|were|of|and|how|what|why|does|when|which|that|this|will|with|from|your)\b/i;

// Idioma-base do RESTO (o que não é termo técnico). Enviesado para português: o app
// é PT-first, então só vira inglês com sinal real — stopwords inglesas, ou quando
// TODA palavra já é um termo técnico conhecido (ex.: "Binary Search Tree").
export function baseLang(text: string): string {
  if (JAPANESE.test(text)) return "ja-JP";
  if (EN_STOPWORDS.test(text)) return "en-US";
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length > 0 && words.every((word) => EN_TERMS.has(word))) return "en-US";
  return "pt-BR";
}

// Divide o texto em trechos por idioma: termos técnicos conhecidos saem em inglês;
// o RESTO fica no idioma-base (baseLang, enviesado para pt). Preserva espaços/
// pontuação — concatenar os trechos reconstrói o texto original, e trechos
// vizinhos do mesmo idioma são unidos (menos cortes na fala).
export function segmentByLang(text: string, restLang?: string): LangSegment[] {
  const base = restLang ?? baseLang(text);
  const tokens = text.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu) ?? [];
  const segments: LangSegment[] = [];
  for (const token of tokens) {
    const isWord = /[\p{L}\p{N}]/u.test(token);
    const lang = isWord && isEnglishTerm(token) ? "en-US" : base;
    const last = segments[segments.length - 1];
    // Espaço/pontuação (não-palavra) junta ao trecho atual sem trocar o idioma.
    if (last && (!isWord || last.lang === lang)) last.text += token;
    else segments.push({ text: token, lang });
  }
  return segments;
}
