import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const { searchParams } = new URL(request.url);
    const grafoId = searchParams.get("grafoId");

    // Get existing nodes in this graph to exclude them
    const existingNodes = await prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId },
      select: { referenciaId: true, tipoNode: true },
    });

    const existingMap = new Map<string, Set<string>>();
    for (const node of existingNodes) {
      if (!existingMap.has(node.tipoNode)) {
        existingMap.set(node.tipoNode, new Set());
      }
      existingMap.get(node.tipoNode)!.add(node.referenciaId);
    }

    // Fetch all user's flashcards that are not in the graph
    const [flashcards, notas] = await Promise.all([
      prisma.flashcard.findMany({
        where: {
          usuarioId: userId,
          id: {
            notIn: Array.from(existingMap.get("FLASHCARD") || []),
          },
        },
        include: {
          conceito: {
            include: {
              topico: {
                include: {
                  assunto: true,
                },
              },
            },
          },
        },
        orderBy: { dataCriacao: "desc" },
        take: 50,
      }),
      prisma.nota.findMany({
        where: {
          usuarioId: userId,
          id: {
            notIn: Array.from(existingMap.get("NOTA") || []),
          },
        },
        orderBy: { dataCriacao: "desc" },
        take: 50,
      }),
    ]);

    // Format flashcards
    const formattedFlashcards = flashcards.map((fc) => {
      const topico = fc.conceito?.topico;
      const assunto = topico?.assunto;
      return {
        id: fc.id,
        label: fc.pergunta.slice(0, 50) + (fc.pergunta.length > 50 ? "..." : ""),
        fullText: fc.pergunta,
        tipo: "FLASHCARD",
        conceitoId: fc.conceitoId,
        hierarquia: assunto
          ? `${assunto.nome} → ${topico!.nome} → ${fc.conceito!.nome}`
          : fc.conceito
            ? `${fc.conceito.nome} (sem tópico)`
            : "Sem conceito",
      };
    });

    // Format notas
    const formattedNotas = notas.map((nota) => ({
      id: nota.id,
      label: nota.textoBruto.slice(0, 50) + (nota.textoBruto.length > 50 ? "..." : ""),
      fullText: nota.textoBruto,
      tipo: "NOTA",
      hierarquia: "Nota direta",
    }));

    return NextResponse.json({
      flashcards: formattedFlashcards,
      notas: formattedNotas,
    });
  } catch (e) {
    console.error("Erro ao buscar itens disponíveis:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar itens" },
      { status: 500 }
    );
  }
}
