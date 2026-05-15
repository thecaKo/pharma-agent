import os from "node:os";

import {
  NEO_AGENT_EVENTS_PATH,
  NEO_AGENT_HEARTBEAT_PATH,
  neoBearerHeaders,
  resolveNeoPath
} from "./neo-http";
import type { LocalConfig } from "../types";

export async function emitAgentEvent(
  config: LocalConfig,
  type: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const path = process.env.PHARMA_AGENT_EVENTS_PATH?.trim() || NEO_AGENT_EVENTS_PATH;
  const url = resolveNeoPath(path, config);
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        ...neoBearerHeaders(config),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type,
        payload
      })
    });
  } catch {
    /* best-effort */
  }
}

export async function postHeartbeat(config: LocalConfig): Promise<void> {
  const path = process.env.PHARMA_AGENT_HEARTBEAT_PATH?.trim() || NEO_AGENT_HEARTBEAT_PATH;
  const url = resolveNeoPath(path, config);
  const body = JSON.stringify({
    machineId: os.hostname(),
    version: process.env.PHARMA_AGENT_VERSION?.trim() || "0.1.0"
  });
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        ...neoBearerHeaders(config),
        "content-type": "application/json"
      },
      body
    });
  } catch {
    /* best-effort */
  }
}
