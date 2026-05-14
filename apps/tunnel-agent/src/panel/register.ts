import { resolvePanelUrl } from "../config/panel-url";
import { LocalConfig, RegisterAgentResponse } from "../types";

export async function registerAgent(config: LocalConfig): Promise<RegisterAgentResponse> {
  const response = await fetch(resolvePanelUrl("/api/agents/register"), {
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
