import { testConnection } from "../db";
import { DbConfig } from "../types";

export async function runTestConnection(config: DbConfig): Promise<{ ok: true }> {
  await testConnection(config);
  return { ok: true };
}
