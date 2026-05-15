import { createHash } from "node:crypto";

import {
  NEO_AGENT_COMMAND_RESULTS_PATH,
  neoBearerHeaders,
  resolveNeoPath
} from "./neo-http";
import type { AgentCommandResponse } from "../types";
import type { LocalConfig } from "../types";

function slimPayloadForStoredEvents(command: string, response: AgentCommandResponse): AgentCommandResponse {
  if (command !== "syncNow" || !response.success || response.data == null || typeof response.data !== "object") {
    return response;
  }
  const data = response.data as Record<string, unknown>;
  if (!Array.isArray(data.products)) {
    return response;
  }
  const productCount = data.products.length;
  const rest = { ...data };
  delete rest.products;
  return {
    ...response,
    data: { ...rest, productCount }
  };
}

export async function postCommandResult(
  config: LocalConfig,
  command: string,
  response: AgentCommandResponse
): Promise<void> {
  const path =
    process.env.PHARMA_AGENT_COMMAND_RESULTS_PATH?.trim() || NEO_AGENT_COMMAND_RESULTS_PATH;
  const url = resolveNeoPath(path, config);
  const slim = slimPayloadForStoredEvents(command, response);
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        ...neoBearerHeaders(config),
        "content-type": "application/json"
      },
      body: JSON.stringify({
        type: response.success ? "success" : "error",
        command,
        message: response.error,
        payload: {
          commandId: slim.commandId,
          success: slim.success,
          data: slim.data,
          error: slim.error
        }
      })
    });
  } catch {
    /* best-effort */
  }
}

export function neoCommandNameFromEvent(eventName: string): string | null {
  if (!eventName.startsWith("command.")) {
    return null;
  }
  return eventName.slice("command.".length);
}

export function productSourceHash(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}
