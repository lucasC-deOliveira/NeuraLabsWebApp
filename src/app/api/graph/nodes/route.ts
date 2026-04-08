import { NextRequest, NextResponse } from "next/server";
import { getGraphNodes } from "@/actions/graph";

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

    const result = await getGraphNodes(grafoId);

    // Transform to simpler format for the modal
    const nodes = result.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      type: node.type,
    }));

    return NextResponse.json({ nodes });
  } catch (e) {
    console.error("Erro ao buscar nós:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao buscar nós" },
      { status: 500 }
    );
  }
}
