# Plano — expandir Text-to-Speech pelo app

Contexto: o TTS já funciona nos flashcards (voz do sistema **ou** Piper neural via
proxy do backend — ver `piper/`, `backend/src/modules/tts/`, `src/lib/tts-api.ts`,
`src/components/flashcard/useSpeech.ts`). O motor lê **qualquer** texto, então
espalhar TTS é quase todo **reúso no frontend — zero backend novo**.

Trava atual: o botão de falar (🔊) está embutido no `FlashcardFace`
(`FaceLabel`/`SpeakBody`), não é reutilizável. A Fase 0 resolve isso.

Regra de coordenação: **uma instância de `useSpeech()` por tela/modal**, passada
aos botões. Assim clicar num trecho para o outro (o hook tem um único `speakingId`).
Instâncias diferentes NÃO se coordenam — por isso compartilhar por tela.

---

## Fase 0 — Habilitador (pré-requisito de tudo)

Extrair o primitivo reutilizável e mover o speech para um local neutro
(virou cross-cutting: notas, questões, grafo — não é mais só "flashcard").

**Mover** `src/components/flashcard/` → `src/components/speech/`:
- `useSpeech.ts`, `speech-settings.ts`, `speech-text.ts`, `piper-voices.ts` (+ specs)
- Atualizar imports em: `FlashcardFace.tsx`, `SpeechSection.tsx` (settings),
  e o novo barrel. (`git mv` para preservar histórico.)

**Criar** `src/components/speech/SpeakButton.tsx`:
```tsx
export function SpeakButton({ speech, id, text, label, className }: {
  speech: ReturnType<typeof useSpeech>; id: string; text: string;
  label: string; className?: string;
}) { /* ícone Volume2/Square + aria-label + toggle — extraído de FaceLabel */ }
```
**Criar** `src/components/speech/SpeakableMarkdown.tsx` (o padrão `SpeakBody`:
div clicável que fala + renderiza markdown). Reaproveitável em notas/questões.

Refatorar `FlashcardFace` para usar os dois novos componentes (sem mudança visual).

- Esforço: baixo. Testes: `SpeakButton` (render + aria + onClick), snapshot do
  `FlashcardFace` continua verde. Sem mudança de comportamento.

---

## Fase 1 — Alto valor, baixo esforço

### 1a. Notas
- `src/modules/notes/presentation/NotaDetailPage.tsx` — `<SpeakButton>` no cabeçalho
  lendo `nota.conteudo` (título + conteúdo). `useSpeech()` no nível da página.
- `.../graph/presentation/components/deck/ViewNotaModal.tsx` — idem dentro do grafo.
- Esforço: baixo. Teste: botão presente + chama toggle com o conteúdo.

### 1b. Auxílio de estudo IA (dica + mnemônico)
- `.../graph/presentation/components/deck/StudyAid.tsx` — `<SpeakButton>` ao lado do
  texto gerado (dica na pergunta, mnemônico na resposta). Compartilha o `useSpeech`
  da sessão (passar via prop a partir do `StudyDeckModal`) para não competir com a
  leitura do card.
- Esforço: baixo-médio. Teste: fala o texto do auxílio quando presente.

---

## Fase 2 — Questões / Provas

- `src/components/questao/QuestaoFace.tsx` — botões por parte:
  enunciado, cada alternativa (opcional), explicação. Ou um "Ler tudo" que
  concatena enunciado → alternativas → explicação numa string.
- Decisão de UX pendente: **por-parte** (granular) vs **ler-tudo** (um clique).
  Recomendação: enunciado + explicação com botão próprio; "ler tudo" como extra.
- Usado em provas (`provas/[id]`) e prévia de questão. `useSpeech()` no nível da face.
- Esforço: médio. Teste: fala enunciado/explicação; ordem do "ler tudo".

---

## Fase 3 — Modais IA do grafo

Texto gerado por IA, agradável de ouvir. `<SpeakButton>` em cada um:
- `.../ai/NodeInsightsModal.tsx` — insights de um nó.
- `.../ai/CommunitySummaryModal.tsx` — resumo de comunidade.
- `.../ai/GraphChatModal.tsx` — ler a última resposta do chat (por mensagem).
- Esforço: médio (vários modais; padrão idêntico). Teste: botão + toggle por modal.

---

## Fase 4 — Modo auto-leitura na sessão de estudo (feature nova)

"Mãos-livres" realista: **auto-ler**, não auto-avaliar (avaliar é julgamento do
usuário — voz-para-nota fica fora de escopo).

Comportamento (quando ligado, em `StudyDeckModal`):
1. Card aparece → fala a **pergunta** automaticamente.
2. Fim do áudio da pergunta → (opção) auto-revela a resposta.
3. Resposta revelada → fala a **resposta**.
4. Usuário avalia (again/hard/good/easy) → próximo card → repete.

Implementação:
- Novo hook `useAutoRead(speech, card, phase, enabled, onAutoReveal)` em
  `src/components/speech/` — reage a mudança de card/phase e dispara `toggle`.
  **NÃO** inchar `StudyDeckModal` (já tem ~505 linhas, perto do cap `max-lines`).
- Toggle "Leitura automática ao estudar" em `SpeechSection` (novo campo em
  `SpeechSettings`: `autoRead: boolean`, default false; normalizar + testar).
- Sinal de "áudio terminou" para encadear passo 2: o `useSpeech` precisa expor um
  callback de fim (hoje só tem `onended` interno). Pequena extensão do hook.
- Esforço: alto. Testes: máquina de estados do `useAutoRead` (pura, sem áudio real).

---

## Cross-cutting

- **Backend:** nada. O endpoint `/api/tts/synthesize` já atende qualquer texto.
- **Gate:** arquivos novos em `src/components/speech/` e nos módulos ficam sob o
  padrão (funções ≤20 linhas em `.ts`; `.tsx` isento por função). Rodar
  `lint:strict` + `arch:check` + testes a cada fase.
- **Fallback:** já embutido no `useSpeech` — Piper fora do ar cai pro sistema;
  japonês sempre usa o sistema (Piper não tem voz JP).
- **Ordem sugerida:** Fase 0 → 1 → 2 → 3 → 4. Cada fase é um commit independente.
