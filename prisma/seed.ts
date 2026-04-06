import { PrismaClient } from "../src/generated/prisma/client"

const prisma = new PrismaClient()

async function main() {
  // ============ USER ============
  const user = await prisma.usuario.upsert({
    where: { email: "usuario@teste.com" },
    update: { nome: "Usuário Teste", senhaHash: "$2b$10$VtCYTcMhu7eCargYMqUmlO46xKvdOgqPMMSpYCL0u/1uo.SFh9cYG", email: "usuario@teste.com" },
    create: { nome: "Usuário Teste", email: "usuario@teste.com", senhaHash: "$2b$10$VtCYTcMhu7eCargYMqUmlO46xKvdOgqPMMSpYCL0u/1uo.SFh9cYG" },
  })
  console.log("User:", user.id)

  // ============ ASSUNTO: Direito Constitucional ============
  const dc = await prisma.assunto.upsert({ where: { id: "dc" }, update: {}, create: { id: "dc", usuarioId: user.id, nome: "Direito Constitucional", descricao: "CF e seus princípios" } })
  const dcT1 = await prisma.topico.upsert({ where: { id: "dc-t1" }, update: {}, create: { id: "dc-t1", assuntoId: dc.id, nome: "Princípios Fundamentais", descricao: "Art. 1-4" } })
  const dcT2 = await prisma.topico.upsert({ where: { id: "dc-t2" }, update: {}, create: { id: "dc-t2", assuntoId: dc.id, nome: "Direitos Fundamentais", descricao: "Art. 5-17" } })
  const dcT3 = await prisma.topico.upsert({ where: { id: "dc-t3" }, update: {}, create: { id: "dc-t3", assuntoId: dc.id, nome: "Organização do Estado", descricao: "Art. 18-43" } })

  const cSoberania = await prisma.conceito.upsert({ where: { id: "cb-soberania" }, update: {}, create: { id: "cb-soberania", topicoId: dcT1.id, nome: "Soberania", descricao: "Fundamento da República" } })
  const cCidadania = await prisma.conceito.upsert({ where: { id: "cb-cidadania" }, update: {}, create: { id: "cb-cidadania", topicoId: dcT1.id, nome: "Cidadania", descricao: "Participação política" } })
  const cDirHumanos = await prisma.conceito.upsert({ where: { id: "cb-dir-humanos" }, update: {}, create: { id: "cb-dir-humanos", topicoId: dcT2.id, nome: "Direitos Humanos", descricao: "Direitos individuais e coletivos" } })
  const cRemedios = await prisma.conceito.upsert({ where: { id: "cb-remedios" }, update: {}, create: { id: "cb-remedios", topicoId: dcT2.id, nome: "Remédios Constitucionais", descricao: "HC, HD, MS, MI" } })
  const cFederalismo = await prisma.conceito.upsert({ where: { id: "cb-federalismo" }, update: {}, create: { id: "cb-federalismo", topicoId: dcT3.id, nome: "Federalismo", descricao: "Org federativa" } })
  const cSepPoderes = await prisma.conceito.upsert({ where: { id: "cb-sep-poderes" }, update: {}, create: { id: "cb-sep-poderes", topicoId: dcT3.id, nome: "Separação de Poderes", descricao: "Exec, Leg, Jud" } })

  // ============ ASSUNTO: Direito Administrativo ============
  const da = await prisma.assunto.upsert({ where: { id: "da" }, update: {}, create: { id: "da", usuarioId: user.id, nome: "Direito Administrativo", descricao: "Administração Pública" } })
  const daT1 = await prisma.topico.upsert({ where: { id: "da-t1" }, update: {}, create: { id: "da-t1", assuntoId: da.id, nome: "Princípios da Adm Pública", descricao: "Art. 37 CF" } })
  const daT2 = await prisma.topico.upsert({ where: { id: "da-t2" }, update: {}, create: { id: "da-t2", assuntoId: da.id, nome: "Atos Administrativos", descricao: "Elementos e atributos" } })

  const cLegalidade = await prisma.conceito.upsert({ where: { id: "cb-legalidade" }, update: {}, create: { id: "cb-legalidade", topicoId: daT1.id, nome: "Legalidade Administrativa", descricao: "Só pode fazer o que a lei autoriza" } })
  const cImpessoalidade = await prisma.conceito.upsert({ where: { id: "cb-impessoalidade" }, update: {}, create: { id: "cb-impessoalidade", topicoId: daT1.id, nome: "Impessoalidade", descricao: "Fim público, sem favoritismo" } })
  const cPoderPolicia = await prisma.conceito.upsert({ where: { id: "cb-poder-policia" }, update: {}, create: { id: "cb-poder-policia", topicoId: daT2.id, nome: "Poder de Polícia", descricao: "Limitar direitos em prol do interesse público" } })
  const cAtoAdm = await prisma.conceito.upsert({ where: { id: "cb-ato-adm" }, update: {}, create: { id: "cb-ato-adm", topicoId: daT2.id, nome: "Ato Administrativo", descricao: "Declaração jurídica do Estado" } })

  // ============ FLASHCARDS (20) ============
  const fcs = [
    { id: "fc-1", c: cSoberania.id, p: "Quais são os fundamentos da República no art. 1º?", r: "Soberania, Cidadania, Dignidade da pessoa humana, Valores sociais do trabalho, Pluralismo político." },
    { id: "fc-2", c: cSoberania.id, p: "Forma de Estado do Brasil?", r: "Federativa. Cláusula pétrea." },
    { id: "fc-3", c: cCidadania.id, p: "Diferença entre princípios e objetivos?", r: "Princípios: estrutura. Objetivos (art. 3º): metas." },
    { id: "fc-4", c: cCidadania.id, p: "O voto é obrigatório ou facultativo?", r: "Obrigatório 18+. Facultativo 16-17, >70 e analfabetos." },
    { id: "fc-5", c: cDirHumanos.id, p: "Os DH do art. 5º são absolutos?", r: "Não. São relativos, limitáveis respeitando núcleo essencial." },
    { id: "fc-6", c: cDirHumanos.id, p: "Status dos tratados de DH com quórum 3/5?", r: "Emendas constitucionais (art. 5º, §3º)." },
    { id: "fc-7", c: cRemedios.id, p: "Qual remédio protege direito líquido e certo?", r: "Mandado de Segurança." },
    { id: "fc-8", c: cRemedios.id, p: "Habeas corpus protege o quê?", r: "Liberdade de locomoção." },
    { id: "fc-9", c: cFederalismo.id, p: "Entes da federação?", r: "União, Estados, DF e Municípios." },
    { id: "fc-10", c: cFederalismo.id, p: "O que é intervenção federal?", r: "Medida excepcional da União para manter ordem." },
    { id: "fc-11", c: cSepPoderes.id, p: "Qual o sistema de governo?", r: "Presidencialista com separação de Poderes." },
    { id: "fc-12", c: cSepPoderes.id, p: "O que são funções típicas e atípicas?", r: "Típica: principal. Atípica: secundária." },
    { id: "fc-13", c: cLegalidade.id, p: "Legalidade admin vs legalidade penal?", r: "Admin: só o que a lei autoriza. Penal: pode o que não é proibido." },
    { id: "fc-14", c: cLegalidade.id, p: "Admin pode restringir direitos sem lei?", r: "Não. Violação ao princípio da legalidade." },
    { id: "fc-15", c: cImpessoalidade.id, p: "O que é a impessoalidade?", r: "Fim público, sem preferências pessoais." },
    { id: "fc-16", c: cImpessoalidade.id, p: "Publicidade decorre de quê?", r: "Do princípio da impessoalidade + publicidade." },
    { id: "fc-17", c: cPoderPolicia.id, p: "O que é poder de polícia?", r: "Limitar conduta/direitos em prol do interesse público." },
    { id: "fc-18", c: cPoderPolicia.id, p: "Atributos do poder de polícia?", r: "Discricionariedade, auto-executoriedade, coercibilidade." },
    { id: "fc-19", c: cAtoAdm.id, p: "Elementos do ato administrativo?", r: "Competência, finalidade, forma, motivo, objeto." },
    { id: "fc-20", c: cAtoAdm.id, p: "Atributos do ato administrativo?", r: "Presunção de legitimidade, imperatividade, auto-executoriedade." },
  ]

  for (const fc of fcs) {
    await prisma.flashcard.upsert({ where: { id: fc.id }, update: {}, create: { id: fc.id, usuarioId: user.id, conceitoId: fc.c, pergunta: fc.p, resposta: fc.r } })
  }

  // ============ SPACED REPETITION ============
  const now = new Date()
  const srRecords = [
    { fc: "fc-1", dif: 5, int: 1 }, { fc: "fc-2", dif: 7, int: 2 },
    { fc: "fc-3", dif: 6, int: 3 }, { fc: "fc-4", dif: 4, int: 1 },
    { fc: "fc-5", dif: 8, int: 0 }, { fc: "fc-6", dif: 3, int: 7 },
    { fc: "fc-7", dif: 4, int: 7 }, { fc: "fc-8", dif: 2, int: 15 },
    { fc: "fc-9", dif: 5, int: 1 }, { fc: "fc-10", dif: 6, int: 4 },
    { fc: "fc-11", dif: 6, int: 4 }, { fc: "fc-12", dif: 5, int: 1 },
    { fc: "fc-13", dif: 3, int: 10 }, { fc: "fc-14", dif: 4, int: 7 },
    { fc: "fc-15", dif: 5, int: 3 }, { fc: "fc-16", dif: 3, int: 14 },
    { fc: "fc-17", dif: 7, int: 2 }, { fc: "fc-18", dif: 7, int: 2 },
    { fc: "fc-19", dif: 6, int: 3 }, { fc: "fc-20", dif: 5, int: 3 },
  ]

  for (const sr of srRecords) {
    await prisma.aprendizadoFlashcard.upsert({
      where: { flashcardId_usuarioId: { flashcardId: sr.fc, usuarioId: user.id } },
      update: {},
      create: {
        flashcardId: sr.fc, usuarioId: user.id,
        dificuldade: sr.dif, intervalo: sr.int,
        proximaRevisao: new Date(now.getTime() - 60_000),
        ultimaRevisao: new Date(now.getTime() - 86_400_000),
        estagioAprendizado: sr.int <= 0 ? 0 : sr.int <= 2 ? 1 : sr.int <= 7 ? 2 : 3,
      },
    })
  }

  console.log("Hierarchy data created.")
  console.log("Seed completo. Arestas semânticas são geradas pelo builder.")
  console.log("Dados:")
  console.log("  2 Assuntos")
  console.log("  5 Tópicos")
  console.log("  10 Conceitos")
  console.log("  20 Flashcards")
  console.log("  5+ tipos de relação cobrindo hierarquia e semântica")
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
