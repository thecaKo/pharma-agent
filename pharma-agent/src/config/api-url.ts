import type { LocalConfig } from "../types";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getPrimaryServiceBaseUrl(config?: LocalConfig | null): string {
  const envApi = process.env.PHARMA_API_URL?.trim();
  const cfgApi = config?.apiUrl?.trim();
  const legacy = process.env.PHARMA_PANEL_URL?.trim();
  const resolved = envApi || cfgApi || legacy || "";
  return resolved ? trimTrailingSlash(resolved) : "";
}

export function resolveServiceUrl(pathname: string, config?: LocalConfig | null): string {
  const base = getPrimaryServiceBaseUrl(config);
  if (!base) {
    throw new Error("Defina PHARMA_API_URL ou apiUrl no config (ou PHARMA_PANEL_URL legado).");
  }
  return new URL(pathname.startsWith("/") ? pathname : `/${pathname}`, `${base}/`).toString();
}

export function getWebTokenBaseUrl(): string {
  const web = process.env.PHARMA_WEB_URL?.trim();
  const legacy = process.env.PHARMA_PANEL_URL?.trim();
  const api = process.env.PHARMA_API_URL?.trim();
  const resolved = web || legacy || api || "";
  return resolved ? trimTrailingSlash(resolved) : trimTrailingSlash("http://localhost:3000");
}
