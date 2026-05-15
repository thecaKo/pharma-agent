import { getPrimaryServiceBaseUrl } from "../config/api-url";
import type { LocalConfig } from "../types";

export const NEO_AGENT_CONFIG_PATH = "/pharma-connector/agent/config";
export const NEO_AGENT_HEARTBEAT_PATH = "/pharma-connector/agent/heartbeat";
export const NEO_AGENT_EVENTS_PATH = "/pharma-connector/agent/events";
export const NEO_AGENT_COMMAND_RESULTS_PATH = "/pharma-connector/agent/command-results";
export const NEO_AGENT_PRODUCTS_SNAPSHOT_PATH = "/pharma-connector/agent/products/snapshot";

export function neoBearerHeaders(config: LocalConfig): Record<string, string> {
  return { Authorization: `Bearer ${config.token}` };
}

export function resolveNeoPath(path: string, config?: LocalConfig | null): string {
  const base = getPrimaryServiceBaseUrl(config);
  if (!base) {
    throw new Error("Defina PHARMA_API_URL ou apiUrl no config.");
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return new URL(p, `${base}/`).toString();
}
