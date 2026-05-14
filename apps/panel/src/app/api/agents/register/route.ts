import { NextResponse } from "next/server";
import { registerAgent } from "@/services/agents";
import { RegisterAgentRequest, RegisterAgentResponse } from "@/types/agent";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<RegisterAgentRequest>;
  const token = String(body.token ?? "").trim();
  const agentName = String(body.agentName ?? "").trim();

  if (!token || !agentName) {
    return NextResponse.json<RegisterAgentResponse>({
      success: false,
      message: "Token e nome do agente sao obrigatorios."
    }, { status: 400 });
  }

  const result = await registerAgent(token, agentName);
  if (!result.success) {
    return NextResponse.json<RegisterAgentResponse>({
      success: false,
      message: result.message
    }, { status: 400 });
  }

  return NextResponse.json<RegisterAgentResponse>({
    success: true,
    agentId: result.agent.id,
    message: "Agente registrado com sucesso."
  });
}
