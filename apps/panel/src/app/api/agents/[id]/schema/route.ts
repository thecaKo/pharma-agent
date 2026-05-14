import { NextResponse } from "next/server";
import { getAgent } from "@/services/agents";
import { fetchSchema } from "@/services/commands";
import { toDbConfig } from "@/services/database-configs";

type Params = {
  params: { id: string };
};

export async function POST(_request: Request, { params }: Params) {
  const agent = await getAgent(params.id);
  if (!agent?.database) {
    return NextResponse.json({ success: false, message: "Configure o banco antes de buscar tabelas." }, { status: 400 });
  }

  try {
    const data = await fetchSchema(params.id, toDbConfig(agent.database));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Falha ao buscar schema."
    }, { status: 400 });
  }
}
