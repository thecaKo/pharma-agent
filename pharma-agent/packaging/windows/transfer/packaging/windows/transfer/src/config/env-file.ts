import fs from "node:fs/promises";
import path from "node:path";
import { getConfigPath } from "./local-config";

export type EnvFileValue = Record<string, string>;

export function resolveEnvFilePath(): string {
  if (process.env.PHARMA_AGENT_ENV_FILE) {
    return path.resolve(process.env.PHARMA_AGENT_ENV_FILE);
  }

  return path.resolve(path.dirname(getConfigPath()), ".env");
}

export async function loadRuntimeEnv(): Promise<void> {
  const envPath = resolveEnvFilePath();
  const fileEnv = await loadEnvFile(envPath);

  for (const [key, value] of Object.entries(fileEnv)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export async function loadEnvFile(filePath: string): Promise<EnvFileValue> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseEnvFile(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function writeEnvFile(filePath: string, env: EnvFileValue): Promise<void> {
  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${escapeEnvValue(value)}`)
    .join("\n");

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${content}\n`, "utf8");
}

export function parseEnvFile(raw: string): EnvFileValue {
  const env: EnvFileValue = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1).trim());
    if (key) {
      env[key] = value;
    }
  }

  return env;
}

function unquote(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function escapeEnvValue(value: string): string {
  if (!value) {
    return "";
  }

  if (/\s|#|"|'/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return value;
}
