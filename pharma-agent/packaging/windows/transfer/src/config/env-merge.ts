import type { LocalConfig } from "../types";

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function applyEnvToConfig(config: LocalConfig | null): LocalConfig | null {
  if (!config) {
    return null;
  }
  const next: LocalConfig = { ...config };
  const token = process.env.PHARMA_AGENT_TOKEN?.trim();
  if (token) {
    next.token = token;
  }
  const apiUrl = process.env.PHARMA_API_URL?.trim();
  if (apiUrl) {
    next.apiUrl = apiUrl;
  }
  next.syncIntervalSeconds = parsePositiveInt(
    process.env.PHARMA_SYNC_INTERVAL_SECONDS,
    config.syncIntervalSeconds ?? 15
  );
  const logLevel = process.env.PHARMA_LOG_LEVEL?.trim();
  if (logLevel) {
    next.logLevel = logLevel;
  }
  return next;
}
