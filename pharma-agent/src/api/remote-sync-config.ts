import { resolveServiceUrl } from "../config/api-url";
import type { ImportConfig, LocalConfig } from "../types";

let cached: ImportConfig | null = null;

export function getCachedImportConfig(): ImportConfig | null {
  return cached;
}

function authHeaders(config: LocalConfig & { agentId: string }): Record<string, string> {
  return {
    "x-agent-id": config.agentId,
    "x-agent-token": config.token
  };
}

export async function refreshImportConfigFromApi(config: LocalConfig & { agentId: string }): Promise<void> {
  const path = process.env.PHARMA_AGENT_SYNC_CONFIG_PATH?.trim() || "/v1/agents/me/sync-config";
  const url = resolveServiceUrl(path, config);
  try {
    const res = await fetch(url, { headers: authHeaders(config) });
    if (!res.ok) {
      cached = null;
      return;
    }
    const data = (await res.json()) as unknown;
    if (data && typeof data === "object" && "db" in data && "mapping" in data) {
      cached = data as ImportConfig;
    } else {
      cached = null;
    }
  } catch {
    cached = null;
  }
}
