import { neoResponseToImportConfig } from "./agent-config-mapper";
import {
  NEO_AGENT_CONFIG_PATH,
  neoBearerHeaders,
  resolveNeoPath
} from "./neo-http";
import type { ImportConfig, LocalConfig } from "../types";

let cached: ImportConfig | null = null;

export function getCachedImportConfig(): ImportConfig | null {
  return cached;
}

export async function refreshImportConfigFromApi(config: LocalConfig): Promise<void> {
  const path =
    process.env.PHARMA_AGENT_SYNC_CONFIG_PATH?.trim() || NEO_AGENT_CONFIG_PATH;
  const url = resolveNeoPath(path, config);
  try {
    const res = await fetch(url, { headers: neoBearerHeaders(config) });
    if (!res.ok) {
      cached = null;
      return;
    }
    const data = (await res.json()) as unknown;
    cached = neoResponseToImportConfig(data);
  } catch {
    cached = null;
  }
}
