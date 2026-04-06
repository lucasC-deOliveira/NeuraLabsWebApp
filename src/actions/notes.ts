"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// ==========================================
// Helpers
// ==========================================

async function resolveUserId(): Promise<string> {
  const user = await prisma.usuario.findFirst({ select: { id: true } });
  if (!user) {
    throw new Error("No user configured -- set up auth");
  }
  return user.id;
}

/**
 * Parse raw text into structured markdown-like content.
 * Detects headings (lines starting with # or ALL CAPS), bullet points, definitions, and paragraphs.
 */
interface ParsedSection {
  heading: string;
  content: string[]; // lines of content under heading
  definitions: Array<{ term: string; explanation: string }>;
}

function parseRawTextIntoSections(rawText: string): ParsedSection[] {
  const lines = rawText.split("\n");
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Markdown heading (# Title) or ALL CAPS line as pseudo-heading
    if (trimmed.startsWith("#") || (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /^[A-Z0-9À-ÚÇ ]+$/.test(trimmed))) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        heading: trimmed.replace(/^#+\s*/, ""),
        content: [],
        definitions: [],
      };
      continue;
    }

    if (!trimmed) continue;

    // "Term: definition" pattern
    if (currentSection && /^[A-ZÀ-ÚÇ][a-zÀ-úÇ, ]{2,40}:\s/.test(trimmed)) {
      const colonIdx = trimmed.indexOf(":");
      currentSection.definitions.push({
        term: trimmed.slice(0, colonIdx).trim(),
        explanation: trimmed.slice(colonIdx + 1).trim(),
      });
    }

    // Bullet point
    if (currentSection && (trimmed.startsWith("- ") || trimmed.startsWith("* "))) {
      currentSection.content.push(trimmed.slice(2));
    }

    // Regular text line
    if (currentSection) {
      currentSection.content.push(trimmed);
    }
  }

  if (currentSection) sections.push(currentSection);

  // If no sections detected, treat entire text as one section
  if (sections.length === 0) {
    sections.push({
      heading: "Nota",
      content: lines.map((l) => l.trim()).filter(Boolean),
      definitions: [],
    });
  }

  return sections;
}

function sectionsToMarkdown(sections: ParsedSection[]): string {
  return sections
    .map((s) => {
      const lines: string[] = [`## ${s.heading}\n`];
      if (s.definitions.length > 0) {
        for (const def of s.definitions) {
          lines.push(`- **${def.term}**: ${def.explanation}`);
        }
        lines.push("");
      }
      if (s.content.length > 0) {
        lines.push(s.content.join("\n"));
      }
      return lines.join("\n");
    })
    .join("\n---\n\n");
}

function extractTermsFromSections(sections: ParsedSection[]): string[] {
  const terms: string[] = [];
  for (const section of sections) {
    for (const def of section.definitions) {
      terms.push(def.term);
    }
    // Also use the heading as a potential concept name
    if (section.heading && section.heading !== "Nota") {
      terms.push(section.heading);
    }
  }
  return terms;
}

// ==========================================
// Find matching concepts for extracted terms
// ==========================================

async function findMatchingConcepts(terms: string[]): Promise<
  Array<{ term: string; conceitoId: string; topicoId: string; assuntoId: string }>
> {
  const matches: Array<{ term: string; conceitoId: string; topicoId: string; assuntoId: string }> = [];

  // Pre-load all concepts with their topic data
  const allConcepts = await prisma.conceito.findMany({
    include: { topico: true },
  });

  for (const term of terms) {
    const lowerTerm = term.toLowerCase();

    // Find by case-insensitive substring match (SQLite doesn't support mode: insensitive)
    const concept = allConcepts.find((c) =>
      c.nome.toLowerCase().includes(lowerTerm) ||
      lowerTerm.includes(c.nome.toLowerCase()),
    );

    if (concept) {
      matches.push({
        term,
        conceitoId: concept.id,
        topicoId: concept.topicoId,
        assuntoId: "", // Will resolve via topico if needed
      });
    }
  }

  return matches;
}

async function ensureNotaNode(notaId: string) {
  const existing = await prisma.nodeConhecimento.findFirst({
    where: { tipoNode: "NOTA", referenciaId: notaId },
  });

  if (!existing) {
    await prisma.nodeConhecimento.create({
      data: { tipoNode: "NOTA", referenciaId: notaId },
    });
  }
}

async function ensureConceptNode(conceitoId: string) {
  const existing = await prisma.nodeConhecimento.findFirst({
    where: { tipoNode: "CONCEITO", referenciaId: conceitoId },
  });

  if (!existing) {
    await prisma.nodeConhecimento.create({
      data: { tipoNode: "CONCEITO", referenciaId: conceitoId },
    });
  }
}

async function ensureFlashcardNode(flashcardId: string) {
  await prisma.nodeConhecimento.create({
    data: { tipoNode: "FLASHCARD", referenciaId: flashcardId },
  });
}

// ==========================================
// Note Actions
// ==========================================

export async function createNota(
  rawText: string,
  titulo?: string,
): Promise<{ notaId: string; matchedConcepts: { term: string; conceito: string }[] }> {
  const userId = await resolveUserId();

  // Parse the text
  const sections = parseRawTextIntoSections(rawText);
  const markdown = sectionsToMarkdown(sections);
  const terms = extractTermsFromSections(sections);

  const result = await prisma.$transaction(async (tx) => {
    // Create the Nota
    const nota = await tx.nota.create({
      data: {
        usuarioId: userId,
        textoBruto: titulo ? `# ${titulo}\n\n${markdown}` : markdown,
      },
    });

    // Find matching concepts for extracted terms
    const conceptMatches = await findMatchingConcepts(terms);

    // Ensure Nota knowledge node exists
    const notaNode = await tx.nodeConhecimento.create({
      data: { tipoNode: "NOTA", referenciaId: nota.id },
    });

    // Link Nota to matched concepts with semantic edges
    for (const match of conceptMatches) {
      // Ensure concept node exists
      await ensureConceptNode(match.conceitoId);

      // Create REFERENCIA edge from Nota -> Concept
      const conceptNode = await tx.nodeConhecimento.findFirst({
        where: { tipoNode: "CONCEITO", referenciaId: match.conceitoId },
      });

      if (conceptNode) {
        // Avoid duplicate edges
        const existingEdge = await tx.conhecimentoAresta.findFirst({
          where: {
            notaOrigemId: nota.id,
            nodeDestinoId: conceptNode.id,
            OR: [{ tipoRelacao: "REFERENCIA" }, { tipoRelacao: "DEFINE" }],
          },
        });

        if (!existingEdge) {
          // First match = DEFINE (it defines that concept), subsequent = REFERENCIA
          const isConceptInName = nota.textoBruto.toLowerCase().includes(match.term.toLowerCase());
          await tx.conhecimentoAresta.create({
            data: {
              notaOrigemId: nota.id,
              nodeDestinoId: conceptNode.id,
              tipoRelacao: isConceptInName ? "DEFINE" : "REFERENCIA",
              peso: isConceptInName ? 1.0 : 0.7,
            },
          });
        }
      }
    }

    return { notaId: nota.id, conceptMatches };
  });

  revalidatePath("/notes");
  return {
    notaId: result.notaId,
    matchedConcepts: result.conceptMatches.map((m) => ({
      term: m.term,
      conceito: m.conceitoId,
    })),
  };
}

export async function getNotas(): Promise<
  Array<{
    id: string;
    preview: string;
    dataCriacao: Date;
    conceitosRelacionados: { nome: string; id: string }[];
    flashcardCount: number;
  }>
> {
  const userId = await resolveUserId();

  const notas = await prisma.nota.findMany({
    where: { usuarioId: userId },
    include: {
      arestasOrigem: {
        include: {
          nodeDestino: {
            include: {
              // Get concept info through the concept model
            },
          },
        },
        where: {
          OR: [
            { nodeDestino: { tipoNode: "CONCEITO" } },
            { nodeDestino: { tipoNode: "TOPICO" } },
            { nodeDestino: { tipoNode: "ASSUNTO" } },
          ],
        },
      },
    },
    orderBy: { dataCriacao: "desc" },
  });

  // Get flashcard count per nota through edges (NOTA -> FLASHCARD edges)
  return Promise.all(
    notas.map(async (nota) => {
      const flashcardsCount = await prisma.conhecimentoAresta.count({
        where: {
          notaOrigemId: nota.id,
          nodeDestino: { tipoNode: "FLASHCARD" },
        },
      });

      // Get related concept names through knowledge graph edges
      const edges = await prisma.conhecimentoAresta.findMany({
        where: { notaOrigemId: nota.id },
        include: { nodeDestino: true },
      });

      const conceitosRelacionados: { nome: string; id: string }[] = [];
      for (const edge of edges) {
        if (edge.nodeDestino?.tipoNode === "CONCEITO") {
          const conceito = await prisma.conceito.findUnique({
            where: { id: edge.nodeDestino.referenciaId },
          });
          if (conceito) {
            conceitosRelacionados.push({ nome: conceito.nome, id: conceito.id });
          }
        }
      }

      return {
        id: nota.id,
        preview: nota.textoBruto.slice(0, 200),
        dataCriacao: nota.dataCriacao,
        conceitosRelacionados,
        flashcardCount: flashcardsCount,
      };
    }),
  );
}

export async function getNotaById(notaId: string): Promise<{
  id: string;
  textoBruto: string;
  dataCriacao: Date;
  conceitosRelacionados: { nome: string; tipoRelacao: string }[];
} | null> {
  const userId = await resolveUserId();

  const nota = await prisma.nota.findUnique({
    where: { id: notaId, usuarioId: userId },
    include: {
      arestasOrigem: {
        include: { nodeDestino: true },
      },
    },
  });

  if (!nota) return null;

  const conceitosRelacionados: { nome: string; tipoRelacao: string }[] = [];
  for (const edge of nota.arestasOrigem) {
    if (edge.nodeDestino?.tipoNode === "CONCEITO") {
      const conceito = await prisma.conceito.findUnique({
        where: { id: edge.nodeDestino.referenciaId },
      });
      if (conceito) {
        conceitosRelacionados.push({ nome: conceito.nome, tipoRelacao: edge.tipoRelacao });
      }
    }
  }

  return {
    id: nota.id,
    textoBruto: nota.textoBruto,
    dataCriacao: nota.dataCriacao,
    conceitosRelacionados,
  };
}

export async function deleteNota(id: string): Promise<{ success: boolean }> {
  await prisma.nota.delete({ where: { id } });
  revalidatePath("/notes");
  return { success: true };
}

// ==========================================
// Generate Flashcards from Note
// ==========================================

export async function generateFlashcardsFromNota(
  notaId: string,
): Promise<{ flashcards: { id: string; pergunta: string }[] }> {
  const userId = await resolveUserId();

  const result = await prisma.$transaction(async (tx) => {
    // Load concepts upfront for memory matching (SQLite lacks case-insensitive support)
    const allConcepts = await tx.conceito.findMany();

    // Match concept by name (case-insensitive, in-memory)
    const findConcept = (searchFor: string): string | null => {
      if (!searchFor) return null;
      const lower = searchFor.toLowerCase();
      return (
        allConcepts.find((c) =>
          c.nome.toLowerCase().includes(lower) ||
          lower.includes(c.nome.toLowerCase()),
        )?.id ?? null
      );
    };

    // Get the nota with its semantic edges
    const nota = await tx.nota.findUnique({
      where: { id: notaId, usuarioId: userId },
      include: {
        arestasOrigem: {
          include: { nodeDestino: true },
        },
      },
    });

    if (!nota) {
      throw new Error("Nota not found");
    }

    // Parse sections to extract definitions as Q&A pairs
    const sections = parseRawTextIntoSections(nota.textoBruto);
    const flashcards: Array<{ id: string; pergunta: string; conceitoId: string }> = [];

    // Build concept map from nota edges (which concepts this nota is about)
    const conceptNodeIds = nota.arestasOrigem
      .filter((e) => e.nodeDestino?.tipoNode === "CONCEITO")
      .map((e) => e.nodeDestino!.referenciaId);

    // 1. Generate flashcards from explicit definitions (Term: Explanation)
    for (const section of sections) {
      for (const def of section.definitions) {
        // Match by explicit term -> concept name
        let targetConceptId = findConcept(def.term);

        // Fallback to first concept linked to this nota, or first available
        if (!targetConceptId && conceptNodeIds.length > 0) {
          targetConceptId = conceptNodeIds[0];
        }

        if (!targetConceptId && allConcepts.length > 0) {
          targetConceptId = allConcepts[0].id;
        }

        if (!targetConceptId) continue;

        // Create flashcard: question = term, answer = explanation
        const fc = await tx.flashcard.create({
          data: {
            pergunta: `O que é/define "${def.term}"?`,
            resposta: def.explanation,
            conceitoId: targetConceptId,
            usuarioId: userId,
          },
        });

        // Create spaced repetition record
        const nextReview = new Date();
        await tx.aprendizadoFlashcard.create({
          data: {
            flashcardId: fc.id,
            usuarioId: userId,
            dificuldade: 5,
            intervalo: 0,
            proximaRevisao: nextReview,
            ultimaRevisao: nextReview,
            estagioAprendizado: 1,
          },
        });

        // Ensure concept node exists
        const conceptNode = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "CONCEITO", referenciaId: targetConceptId },
        });
        const finalConceptNode = conceptNode ?? await tx.nodeConhecimento.create({
          data: { tipoNode: "CONCEITO", referenciaId: targetConceptId },
        });

        // Create flashcard node
        await tx.nodeConhecimento.create({
          data: { tipoNode: "FLASHCARD", referenciaId: fc.id },
        });

        // Link Flashcard -> Concept with TESTA_DEFINICAO
        const fcNode = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "FLASHCARD", referenciaId: fc.id },
        });

        if (fcNode) {
          await tx.conhecimentoAresta.create({
            data: {
              nodeOrigemId: fcNode.id,
              nodeDestinoId: finalConceptNode.id,
              tipoRelacao: "TESTA_DEFINICAO",
              peso: 1.0,
            },
          });

          // Link Nota -> Flashcard with GERA
          await tx.conhecimentoAresta.create({
            data: {
              notaOrigemId: nota.id,
              nodeDestinoId: fcNode.id,
              tipoRelacao: "GERA",
              peso: 1.0,
            },
          });

          // Link Flashcard -> Nota with REFERENCIA
          await tx.conhecimentoAresta.create({
            data: {
              nodeOrigemId: fcNode.id,
              notaOrigemId: nota.id,
              tipoRelacao: "REFERENCIA",
              peso: 0.8,
            },
          });
        }

        flashcards.push({ id: fc.id, pergunta: fc.pergunta, conceitoId: targetConceptId });
      }
    }

    // 2. Fallback: create cards from section headings + content
    if (flashcards.length === 0) {
      for (const section of sections) {
        if (section.content.length === 0) continue;

        // Match by heading -> concept name
        let targetConceptId = findConcept(section.heading);

        if (!targetConceptId && conceptNodeIds.length > 0) {
          targetConceptId = conceptNodeIds[0];
        }

        if (!targetConceptId && allConcepts.length > 0) {
          targetConceptId = allConcepts[0].id;
        }

        if (!targetConceptId) continue;

        const content = section.content.join("\n");
        const fc = await tx.flashcard.create({
          data: {
            pergunta: `Explique: ${section.heading}`,
            resposta: content.slice(0, 500),
            conceitoId: targetConceptId,
            usuarioId: userId,
          },
        });

        // Spaced repetition
        const nextReview = new Date();
        await tx.aprendizadoFlashcard.create({
          data: {
            flashcardId: fc.id,
            usuarioId: userId,
            dificuldade: 5,
            intervalo: 0,
            proximaRevisao: nextReview,
            ultimaRevisao: nextReview,
            estagioAprendizado: 1,
          },
        });

        // Knowledge nodes
        const conceptNode = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "CONCEITO", referenciaId: targetConceptId },
        });
        const finalConceptNode = conceptNode ?? await tx.nodeConhecimento.create({
          data: { tipoNode: "CONCEITO", referenciaId: targetConceptId },
        });

        await tx.nodeConhecimento.create({
          data: { tipoNode: "FLASHCARD", referenciaId: fc.id },
        });

        const fcNode = await tx.nodeConhecimento.findFirst({
          where: { tipoNode: "FLASHCARD", referenciaId: fc.id },
        });

        if (fcNode) {
          await tx.conhecimentoAresta.create({
            data: {
              nodeOrigemId: fcNode.id,
              nodeDestinoId: finalConceptNode.id,
              tipoRelacao: "TESTA_DEFINICAO",
              peso: 0.9,
            },
          });

          await tx.conhecimentoAresta.create({
            data: {
              notaOrigemId: nota.id,
              nodeDestinoId: fcNode.id,
              tipoRelacao: "GERA",
              peso: 1.0,
            },
          });
        }

        flashcards.push({ id: fc.id, pergunta: fc.pergunta, conceitoId: targetConceptId });
      }
    }

    return { flashcards };
  });

  revalidatePath("/notes");
  revalidatePath("/flashcards");
  return result;
}
