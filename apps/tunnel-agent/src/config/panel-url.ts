const DEFAULT_PANEL_URL = "http://localhost:3000";
const TOKEN_PATH = "/tokens/new";

export function getPanelUrl(): string {
  return trimTrailingSlash(process.env.PHARMA_PANEL_URL ?? DEFAULT_PANEL_URL);
}

export function getPanelTokenUrl(): string {
  const url = new URL(TOKEN_PATH, `${getPanelUrl()}/`);
  return url.toString();
}

export function resolvePanelUrl(pathname: string): string {
  const url = new URL(pathname, `${getPanelUrl()}/`);
  return url.toString();
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
