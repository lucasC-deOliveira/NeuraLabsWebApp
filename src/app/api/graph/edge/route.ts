import { NextRequest, NextResponse } from "next/server";
import { createEdge, updateEdge, deleteEdge, getGraphEdges } from "@/actions/graph";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { grafoId, sourceNodeId, targetNodeId, tipoRelacao, peso } = body;

    if (!grafoId || !sourceNodeId || !targetNodeId || !tipoRelacao) {
      return NextResponse.json(
        { error: "grafoId, sourceNodeId, targetNodeId e tipoRelacao são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await createEdge(grafoId, {
      sourceNodeId,
      targetNodeId,
      tipoRelacao,
      peso: peso ?? 1.0,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Erro ao criar relação:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao criar relação" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { grafoId, edgeId, tipoRelacao, peso } = body;

    if (!grafoId || !edgeId) {
      return NextResponse.json(
        { error: "grafoId e edgeId são obrigatórios" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (tipoRelacao) updateData.tipoRelacao = tipoRelacao;
    if (peso !== undefined) updateData.peso = peso;

    const result = await updateEdge(edgeId, grafoId, updateData);

    return NextResponse.json(result);
  } catch (e) {
    console.error("Erro ao atualizar relação:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao atualizar relação" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grafoId = searchParams.get("grafoId");
    const edgeId = searchParams.get("edgeId");

    if (!grafoId || !edgeId) {
      return NextResponse.json(
        { error: "grafoId e edgeId são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await deleteEdge(edgeId, grafoId);

    return NextResponse.json(result);
  } catch (e) {
    console.error("Erro ao remover relação:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao remover relação" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grafoId = searchParams.get("grafoId");

    if (!grafoId) {
      return NextResponse.json(
        { error: "grafoId é obrigatório" },
        { status: 400 }
      );
    }

    const edges = await getGraphEdges(grafoId);

    return NextResponse.json({ edges });
  } catch (e) {
    console.error("Erro ao buscar relações:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar relações" },
      { status: 500 }
    );
  }
}
