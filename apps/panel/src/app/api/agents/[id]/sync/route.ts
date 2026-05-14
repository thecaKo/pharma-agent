import { NextResponse } from "next/server";
import { markSyncFailed, runProductSync, updateSyncConfig } from "@/services/sync";

type Params = {
  params: { id: string };
};

export async function POST(request: Request, { params }: Params) {
  const body = await request.json().catch(() => ({})) as { action?: string; intervalSeconds?: number };

  if (body.action === "configure") {
    const config = await updateSyncConfig(params.id, {
      intervalSeconds: Number(body.intervalSeconds ?? 15)
    });
    return NextResponse.json({ success: true, data: config });
  }

  try {
    const result = await runProductSync(params.id);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao sincronizar produtos.";
    await markSyncFailed(params.id, message);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
