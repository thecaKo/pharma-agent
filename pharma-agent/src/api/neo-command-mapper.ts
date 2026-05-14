import type { AgentCommand, DatabaseFileSearchPayload, DbConfig, ImportConfig } from "../types";

export type WireCommand = {
  id: string;
  type: string;
  payload: unknown;
};

const LEGACY_TYPES = new Set<string>([
  "db:test",
  "db:schema",
  "db:columns",
  "database:auto-detect",
  "database:deep-scan",
  "database:files",
  "database:validate-file",
  "firebird:auto-detect",
  "firebird:deep-scan",
  "firebird:files",
  "firebird:validate-file",
  "products:import",
  "products:sync"
]);

export function extractWireCommand(message: unknown): WireCommand | null {
  if (!message || typeof message !== "object") {
    return null;
  }
  const o = message as Record<string, unknown>;
  if (o.type === "command" && o.payload && typeof o.payload === "object") {
    const p = o.payload as Record<string, unknown>;
    if (typeof p.id === "string" && typeof p.type === "string" && "payload" in p) {
      return { id: p.id, type: p.type, payload: p.payload };
    }
  }
  if (typeof o.id === "string" && typeof o.type === "string" && "payload" in o) {
    return { id: o.id, type: o.type, payload: o.payload };
  }
  return null;
}

function asDbConfig(payload: unknown): DbConfig {
  return payload as DbConfig;
}

function asSearchPayload(payload: unknown): DatabaseFileSearchPayload | undefined {
  return (payload ?? undefined) as DatabaseFileSearchPayload | undefined;
}

export function wireToAgentCommand(wire: WireCommand, getImport: () => ImportConfig | null): AgentCommand | null {
  if (LEGACY_TYPES.has(wire.type)) {
    return { id: wire.id, type: wire.type, payload: wire.payload } as AgentCommand;
  }
  switch (wire.type) {
    case "command.searchDatabases":
      return {
        id: wire.id,
        type: "database:deep-scan",
        payload: asSearchPayload(wire.payload) ?? {}
      };
    case "command.testDatabase":
      return { id: wire.id, type: "db:test", payload: asDbConfig(wire.payload) };
    case "command.loadColumns":
      return { id: wire.id, type: "db:columns", payload: asDbConfig(wire.payload) as DbConfig & { table: string } };
    case "command.syncNow": {
      const ic = getImport();
      if (!ic) {
        return null;
      }
      return { id: wire.id, type: "products:sync", payload: ic };
    }
    default:
      return null;
  }
}
