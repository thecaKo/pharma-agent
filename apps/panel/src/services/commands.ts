import crypto from "node:crypto";
import { sendCommand } from "@/server/agent-registry";
import { AgentCommand, DatabaseFileSearchPayload, DbConfig, ImportConfig } from "@/types/agent";

export async function testDatabase(agentId: string, db: DbConfig) {
  return runAgentCommand(agentId, {
    id: crypto.randomUUID(),
    type: "db:test",
    payload: db
  });
}

export async function fetchSchema(agentId: string, db: DbConfig) {
  return runAgentCommand(agentId, {
    id: crypto.randomUUID(),
    type: "db:schema",
    payload: db
  });
}

export async function fetchColumns(agentId: string, db: DbConfig, table: string) {
  return runAgentCommand(agentId, {
    id: crypto.randomUUID(),
    type: "db:columns",
    payload: { ...db, table }
  });
}

export async function importProducts(agentId: string, config: ImportConfig) {
  return runAgentCommand(agentId, {
    id: crypto.randomUUID(),
    type: "products:import",
    payload: config
  }, 120000);
}

export async function syncProducts(agentId: string, config: ImportConfig, timeoutMs = 120000) {
  return runAgentCommand(agentId, {
    id: crypto.randomUUID(),
    type: "products:sync",
    payload: config
  }, timeoutMs);
}

export async function autoDetectDatabaseFiles(agentId: string) {
  return runAgentCommand(agentId, {
    id: crypto.randomUUID(),
    type: "database:auto-detect",
    payload: {
      maxDepth: 3,
      maxResults: 100
    }
  }, 20000);
}

export async function deepScanDatabaseFiles(agentId: string) {
  return runAgentCommand(agentId, {
    id: crypto.randomUUID(),
    type: "database:deep-scan",
    payload: {
      maxDepth: 12,
      maxResults: 300,
      timeoutMs: 60000
    }
  }, 70000);
}

export async function fetchDatabaseFiles(agentId: string, payload: DatabaseFileSearchPayload | string) {
  return runAgentCommand(agentId, {
    id: crypto.randomUUID(),
    type: "database:files",
    payload: typeof payload === "string" ? { directory: payload } : payload
  }, 20000);
}

export async function validateDatabaseFile(agentId: string, filePath: string) {
  return runAgentCommand(agentId, {
    id: crypto.randomUUID(),
    type: "database:validate-file",
    payload: { path: filePath }
  });
}

export const autoDetectFirebirdFiles = autoDetectDatabaseFiles;
export const deepScanFirebirdFiles = deepScanDatabaseFiles;
export const fetchFirebirdFiles = fetchDatabaseFiles;
export const validateFirebirdFile = validateDatabaseFile;

async function runAgentCommand(agentId: string, command: AgentCommand, timeoutMs?: number) {
  const response = await sendCommand(agentId, command, timeoutMs);
  if (!response.success) {
    throw new Error(response.error ?? "Comando falhou.");
  }
  return response.data;
}
