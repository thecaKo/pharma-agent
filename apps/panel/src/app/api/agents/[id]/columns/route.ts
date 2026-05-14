import { NextResponse } from "next/server";
import { getAgent } from "@/services/agents";
import { fetchColumns } from "@/services/commands";
import { toDbConfig } from "@/services/database-configs";

type Params = {
  params: { id: string };
};

export async function POST(request: Request, { params }: Params) {
  const body = (await request.json()) as { table?: string };
  const table = String(body.table ?? "").trim();
  const agent = await getAgent(params.id);

  if (!agent?.database) {
    return NextResponse.json({ success: false, message: "Configure o banco antes de buscar colunas." }, { status: 400 });
  }

  if (!table) {
    return NextResponse.json({ success: false, message: "Tabela obrigatoria." }, { status: 400 });
  }

  try {
    const data = await fetchColumns(params.id, toDbConfig(agent.database), table);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Falha ao buscar colunas."
    }, { status: 400 });
  }
}
