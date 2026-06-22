# NeuraLabs — Checklist de Testes: Features de IA

> Pré-requisito: estar logado, ter pelo menos um grafo com alguns nós (assuntos, tópicos, conceitos e notas).
> Configure a API de IA em **Configurações → Conexão com IA** antes de testar.

---

## 1. Gerar grafo a partir de texto

**Onde:** Grafo → botão **IA** → Construir → "Gerar grafo"

**Como testar:**
1. Abra um grafo (pode estar vazio ou não)
2. Clique em **IA → Gerar grafo**
3. Cole um texto de estudo (mínimo 3–4 parágrafos)
4. Clique em **Gerar**

**Resultado esperado:**
- Modal mostra contagem: Assunto, Tópicos, Conceitos, Notas, Flashcards criados
- Nós aparecem no grafo após fechar
- Relações entre nós estão corretas (PERTENCE_A, PREREQUISITO, etc.)

**Casos de borda:**
- [ ] Texto muito curto (< 50 palavras) → deve gerar algo ou avisar
- [ ] Texto em inglês → nós criados em inglês

---

## 2. Auto-conectar (auto-link)

**Onde:** Grafo → botão **IA** → Construir → "Auto-conectar nós"

**Como testar:**
1. Tenha um grafo com ao menos 5 nós sem muitas conexões
2. Clique em **IA → Auto-conectar nós**
3. Aguarde a lista de sugestões

**Resultado esperado:**
- Modal exibe pares de nós com tipo de relação e motivo
- Botão "Aplicar selecionados" cria as arestas
- Arestas já existentes NÃO aparecem como sugestão (sem duplicatas)

**Casos de borda:**
- [ ] Grafo sem nós → modal avisa "nenhuma sugestão"
- [ ] Todas as conexões possíveis já existem → lista vazia

---

## 3. Detectar pré-requisitos faltantes

**Onde:** Grafo → botão **IA** → Construir → "Pré-requisitos faltantes"

**Como testar:**
1. Grafo com conceitos e tópicos mas sem pré-requisitos definidos
2. Clique em **IA → Pré-requisitos faltantes**
3. Analise as sugestões
4. Clique no ícone **+** em uma sugestão para adicioná-la ao grafo

**Resultado esperado:**
- Lista de nós sugeridos (conceitos ou tópicos que deveriam ser pré-requisitos)
- Ao adicionar: nó aparece no grafo com aresta correta (PREREQUISITO ou DEPENDE_DE)
- Tipo de aresta correto conforme tipo do nó destino

**Casos de borda:**
- [ ] CONCEITO → CONCEITO deve criar relação PREREQUISITO
- [ ] TOPICO → TOPICO deve criar relação DEPENDE_DE
- [ ] CONCEITO → TOPICO deve criar relação PERTENCE_A

---

## 4. Completude do conhecimento

**Onde:** Grafo → botão **IA** → Analisar → "Avaliar completude"

**Como testar:**
1. Grafo com ao menos 1 assunto e vários conceitos/notas
2. Clique em **IA → Avaliar completude**
3. Aguarde a análise

**Resultado esperado:**
- Para cada assunto: barra de score (0–10), lista verde (bem coberto), amarela (raso), vermelha (faltando)
- Score ≥ 7 → barra verde; 4–6 → amarela; < 4 → vermelha

**Casos de borda:**
- [ ] Grafo sem assuntos → mensagem "Nenhum assunto encontrado"
- [ ] Botão "Regerar" faz nova chamada e atualiza o resultado

---

## 5. Trilha de aprendizado

**Onde:** Grafo → botão **IA** → Analisar → "Trilha de aprendizado"

**Como testar:**
1. Grafo com hierarquia clara (assunto → tópicos → conceitos)
2. Clique em **IA → Trilha de aprendizado**

**Resultado esperado:**
- Lista numerada de nós em ordem de estudo sugerida
- Cada item mostra: badge com tipo (ASSUNTO/TOPICO/CONCEITO), nome e motivo
- Ordem respeita dependências (fundamentos antes de avançados)

**Casos de borda:**
- [ ] Grafo com poucos nós → trilha curta mas coerente
- [ ] Botão "Regerar" gera nova trilha

---

## 6. Detectar e mesclar duplicatas

**Onde:** Grafo → botão **IA** → Limpar → "Detectar duplicatas"

**Como testar:**
1. Grafo com nós de nome similar (ex: "Orientação a Objetos" e "POO")
2. Clique em **IA → Detectar duplicatas**
3. Para cada grupo: clique no nó que quer **manter** (chip fica com borda roxa e label "manter")
4. Clique em **Mesclar grupo**

**Resultado esperado:**
- Grupos de nós com nomes parecidos
- Ao mesclar: nó deletado some do grafo; arestas migram para o nó mantido
- Nenhuma aresta duplicada criada

**Casos de borda:**
- [ ] Grupo com 3+ nós → escolha de 1 para manter, demais deletados
- [ ] Grafo sem duplicatas → "Nenhum grupo encontrado"

---

## 7. Chat com o grafo

**Onde:** Grafo → botão **IA** → Explorar → "Chat com o grafo"

**Como testar:**
1. Grafo com conteúdo razoável (notas com texto)
2. Clique em **IA → Chat com o grafo**
3. Faça perguntas sobre o conteúdo do grafo:
   - "Quais são os conceitos mais importantes?"
   - "Como X se relaciona com Y?"
   - "O que ainda está faltando no grafo sobre Z?"

**Resultado esperado:**
- Respostas contextuais baseadas no conteúdo do grafo
- Chips de nós referenciados aparecem abaixo da resposta do assistente
- Histórico mantido ao longo da conversa
- Fechar e reabrir: histórico limpo

**Casos de borda:**
- [ ] Grafo vazio → resposta genérica ou aviso
- [ ] Pergunta fora do contexto → IA avisa que não encontrou referência
- [ ] Múltiplos turnos de conversa → contexto acumulado corretamente

---

## 8. Insights da IA (por nó)

**Onde:** Clique em qualquer nó → Painel direito → seção **IA** → "Insights da IA"

**Como testar:**
1. Clique em um nó (ASSUNTO, TOPICO, CONCEITO ou NOTA)
2. No painel de propriedades, clique em **Insights da IA**
3. Aguarde os insights
4. Clique em **Adicionar ao grafo** nos insights desejados

**Resultado esperado:**
- Lista de insights com categoria, título, descrição, tipo de nó sugerido e relação
- Contexto usa vizinhos diretos do nó selecionado
- Ao adicionar: novo nó aparece no grafo conectado ao nó de origem

**Casos de borda:**
- [ ] Nó sem vizinhos → insights mais genéricos
- [ ] Nó NOTA → insights específicos para notas

---

## 9. Expandir nó com IA

**Onde:** Clique em ASSUNTO, TOPICO, CONCEITO ou NOTA → Painel direito → seção **IA** → "Expandir com IA"

**Como testar:**
1. Selecione um nó que quer aprofundar
2. Clique em **Expandir com IA**

**Resultado esperado:**
- Novos sub-nós criados (tópicos, conceitos, notas) conectados ao nó expandido
- Toast mostra contagem: "X tópicos, Y conceitos, Z notas criados"
- Nós aparecem no grafo

**Casos de borda:**
- [ ] Nó FLASHCARD ou BARALHO → botão não aparece (só para ASSUNTO/TOPICO/CONCEITO/NOTA)

---

## 10. Detectar gaps entre comunidades

**Onde:** Grafo → painel de detecção de gaps (ícone de lacuna na toolbar)

**Como testar:**
1. Grafo com pelo menos 2 grupos de nós sem conexão entre si
2. Selecione dois grupos/comunidades
3. Clique em **Detectar gap**

**Resultado esperado:**
- Sugestões de conceitos ou relações que conectariam os dois grupos
- Cada sugestão: título, descrição, tipo de nó, relação
- Opção de adicionar ao grafo

**Casos de borda:**
- [ ] Grupos já bem conectados → poucas sugestões ou nenhuma

---

## 11. Resumo de comunidade

**Onde:** Grafo → selecionar múltiplos nós → opção "Resumo da seleção"

**Como testar:**
1. Selecione 3+ nós relacionados no grafo (Ctrl+clique ou seleção de área)
2. Acione o resumo de comunidade

**Resultado esperado:**
- Título e resumo coeso do que o grupo de nós representa
- Texto integra o conteúdo dos nós selecionados

---

## 12. Sugestão de relações para nota

**Onde:** Ao criar/editar uma nota → seção de relações → "Sugerir relações"

**Como testar:**
1. Abra ou crie uma nota com título e conteúdo
2. Clique em **Sugerir relações com IA**

**Resultado esperado:**
- Lista de nós do grafo com tipo de relação sugerida e motivo
- Pode aceitar sugestões individualmente

---

## 13. Gerar flashcards via IA

**Onde:** Abrir uma nota → botão "Gerar flashcards"

**Como testar:**
1. Abra uma nota com conteúdo substancial
2. Clique em **Gerar flashcards via IA**

**Resultado esperado:**
- Flashcards gerados com pergunta e resposta baseados no conteúdo da nota
- Preview mostrando os flashcards antes de salvar
- Flashcards salvos vinculados ao conceito da nota

**Casos de borda:**
- [ ] Nota sem conteúdo → gera flashcards genéricos ou avisa

---

## 14. Analisar texto bruto

**Onde:** Grafo ou notas → importar texto bruto

**Como testar:**
1. Acione a opção de análise de texto
2. Cole um texto longo (artigo, resumo de aula, etc.)
3. Aguarde a análise

**Resultado esperado:**
- Lista de notas candidatas extraídas do texto
- Cada candidata: título, conteúdo, conceitos previstos
- Seleção de quais notas salvar

---

## 15. Claude Code local (desktop only)

**Onde:** Configurações → Claude Code (local) → toggle

**Como testar:**
1. Certifique-se que `claude` está instalado: `claude --version` no terminal
2. Certifique-se que está autenticado: `claude /status`
3. Ative o toggle em Configurações
4. Vá a qualquer grafo e execute qualquer feature de IA acima

**Resultado esperado:**
- Toast "Claude Code ativado"
- Campos de API ficam desabilitados com banner roxo
- Features de IA funcionam usando o claude local (sem API key externa)
- Desativar: toggle off → config de API original restaurada

**Casos de borda:**
- [ ] `claude` não instalado → feature de IA retorna erro claro
- [ ] Não autenticado → erro de auth do claude
- [ ] Reabrir app com Claude Code ativo → proxy reinicia automaticamente

---

## Erros comuns

| Sintoma | Causa provável |
|---|---|
| "Erro ao conectar" em todas as features | API key não configurada ou inválida |
| Timeout sem resposta | Modelo muito lento / sem cota |
| Nós criados sem aresta | Bug de relação — verifique tipo dos nós |
| Claude Code: "claude not found" | `npm install -g @anthropic-ai/claude-code` não feito |
| Claude Code: resposta vazia | `claude /login` necessário |
