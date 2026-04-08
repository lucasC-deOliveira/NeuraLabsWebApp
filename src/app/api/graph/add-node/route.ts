import { NextRequest, NextResponse } from "next/server";
import { addNodeToGraph } from "@/actions/graph";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { grafoId, tipoNode, ...data } = body;

    if (!grafoId || !tipoNode) {
      return NextResponse.json(
        { error: "grafoId e tipoNode são obrigatórios" },
        { status: 400 }
      );
    }

    const result = await addNodeToGraph(grafoId, tipoNode, data);

    return NextResponse.json(result);
  } catch (e) {
    console.error("Erro ao criar nó:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao criar nó" },
      { status: 500 }
    );
  }
}
