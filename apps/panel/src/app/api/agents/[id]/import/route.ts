import { NextResponse } from "next/server";
import { getAgent } from "@/services/agents";
import { importProducts } from "@/services/commands";
import { toDbConfig } from "@/services/database-configs";
import { createImportJob, failImportJob, finishImportJob } from "@/services/imports";
import { toAgentMapping } from "@/services/mappings";
import { ImportResult } from "@/types/agent";

type Params = {
  params: { id: string };
};

export async function POST(_request: Request, { params }: Params) {
  const agent = await getAgent(params.id);

  if (!agent?.database) {
    return NextResponse.json({ success: false, message: "Configure o banco antes de importar." }, { status: 400 });
  }

  if (!agent.mapping) {
    return NextResponse.json({ success: false, message: "Configure o mapping antes de importar." }, { status: 400 });
  }

  const job = await createImportJob(params.id);

  try {
    const result = await importProducts(params.id, {
      db: toDbConfig(agent.database),
      mapping: toAgentMapping(agent.mapping)
    }) as ImportResult;
    const saved = await finishImportJob(job.id, result);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao importar produtos.";
    const failed = await failImportJob(job.id, message);
    return NextResponse.json({ success: false, message, data: failed }, { status: 400 });
  }
}
