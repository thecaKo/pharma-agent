import os from "node:os";

import { resolveServiceUrl } from "../config/api-url";
import type { LocalConfig } from "../types";

function authHeaders(config: LocalConfig & { agentId: string }): Record<string, string> {
  return {
    "x-agent-id": config.agentId,
    "x-agent-token": config.token
  };
}

export async function emitAgentEvent(
  config: LocalConfig & { agentId: string },
  type: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const path = process.env.PHARMA_AGENT_EVENTS_PATH?.trim() || "/v1/agents/me/events";
  const url = resolveServiceUrl(path, config);
  const body = JSON.stringify({
    type,
    timestamp: new Date().toISOString(),
    payload
  });
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        ...authHeaders(config),
        "content-type": "application/json"
      },
      body
    });
  } catch {
    /* best-effort */
  }
}

export async function postHeartbeat(config: LocalConfig & { agentId: string }): Promise<void> {
  const path = process.env.PHARMA_AGENT_HEARTBEAT_PATH?.trim() || "/v1/agents/me/heartbeat";
  const url = resolveServiceUrl(path, config);
  const body = JSON.stringify({
    agentId: config.agentId,
    hostname: os.hostname()
  });
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        ...authHeaders(config),
        "content-type": "application/json"
      },
      body
    });
  } catch {
    /* best-effort */
  }
}
