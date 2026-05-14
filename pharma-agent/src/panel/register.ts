import { resolveServiceUrl } from "../config/api-url";
import { LocalConfig, RegisterAgentResponse } from "../types";

export async function registerAgent(config: LocalConfig): Promise<RegisterAgentResponse> {
  const path = process.env.PHARMA_AGENT_REGISTER_PATH?.trim() || "/api/agents/register";
  let url: string;
  try {
    url = resolveServiceUrl(path, config);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "URL da API invalida"
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      token: config.token,
      agentName: config.agentName
    })
  });

  if (!response.ok) {
    const message = await response.text();
    return {
      success: false,
      message: message || `Painel respondeu HTTP ${response.status}`
    };
  }

  return (await response.json()) as RegisterAgentResponse;
}
