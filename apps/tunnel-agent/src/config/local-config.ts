import fs from "node:fs/promises";
import path from "node:path";
import { LocalConfig } from "../types";

const DEFAULT_CONFIG_FILE = "config.local.json";

export function getConfigPath(): string {
  return process.env.PHARMA_AGENT_CONFIG
    ? path.resolve(process.env.PHARMA_AGENT_CONFIG)
    : path.resolve(process.cwd(), DEFAULT_CONFIG_FILE);
}

export async function loadConfig(): Promise<LocalConfig | null> {
  try {
    const raw = await fs.readFile(getConfigPath(), "utf8");
    return JSON.parse(raw) as LocalConfig;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function saveConfig(config: LocalConfig): Promise<void> {
  const configPath = getConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function isRegistered(config: LocalConfig | null): config is LocalConfig & { agentId: string } {
  return Boolean(config?.token && config.agentName && config.agentId);
}
