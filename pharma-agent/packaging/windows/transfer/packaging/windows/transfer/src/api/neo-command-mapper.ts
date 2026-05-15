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

function asSearchPayload(payload: unknown): DatabaseFileSearchPayload | undefined {
  return (payload ?? undefined) as DatabaseFileSearchPayload | undefined;
}

function numberOrDefault(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function firstFilled(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function dbConfigFromPanelPayload(payload: Record<string, unknown>): DbConfig | null {
  const driver = typeof payload.driver === "string" ? payload.driver : "firebird";
  const rawMode =
    typeof payload.connectionMode === "string"
      ? payload.connectionMode
      : typeof payload.connection_mode === "string"
        ? payload.connection_mode
        : "";
  const mode = rawMode.trim().toLowerCase();
  const useName = mode === "name" || mode === "database";
  let database = "";
  if (useName) {
    database = firstFilled(payload.databaseName, payload.database_name, payload.database);
  } else {
    database = firstFilled(
      payload.database,
      payload.databasePath,
      payload.database_path,
      payload.databaseName,
      payload.database_name
    );
  }
  if (!database) {
    return null;
  }
  return {
    driver: driver as DbConfig["driver"],
    host: typeof payload.host === "string" && payload.host.trim() ? payload.host : "localhost",
    port: numberOrDefault(payload.port, driver === "firebird" || driver === "interbase" ? 3050 : 0),
    database,
    user: typeof payload.username === "string" ? payload.username : typeof payload.user === "string" ? payload.user : "",
    password: typeof payload.password === "string" ? payload.password : ""
  };
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
    case "command.testDatabase": {
      const asPayload = wire.payload as Record<string, unknown> | null;
      const looksLikeDb =
        asPayload && typeof asPayload === "object" && "driver" in asPayload && "database" in asPayload;
      if (looksLikeDb) {
        return { id: wire.id, type: "db:test", payload: asPayload as DbConfig };
      }
      if (asPayload && typeof asPayload === "object") {
        const db = dbConfigFromPanelPayload(asPayload);
        if (db) {
          return { id: wire.id, type: "db:test", payload: db };
        }
      }
      const ic = getImport();
      return ic ? { id: wire.id, type: "db:test", payload: ic.db } : null;
    }
    case "command.loadSchema": {
      const asPayload = wire.payload as Record<string, unknown> | null;
      if (asPayload && typeof asPayload === "object") {
        const db = dbConfigFromPanelPayload(asPayload);
        if (db) {
          return { id: wire.id, type: "db:schema", payload: db };
        }
      }
      const ic = getImport();
      return ic ? { id: wire.id, type: "db:schema", payload: ic.db } : null;
    }
    case "command.loadColumns": {
      const asPayload = wire.payload as Record<string, unknown> | null;
      const looksLikeDb =
        asPayload && typeof asPayload === "object" && "driver" in asPayload && "table" in asPayload;
      if (looksLikeDb) {
        return {
          id: wire.id,
          type: "db:columns",
          payload: asPayload as DbConfig & { table: string }
        };
      }
      const ic = getImport();
      const tableName =
        asPayload && typeof asPayload.tableName === "string" && asPayload.tableName.trim()
          ? asPayload.tableName.trim()
          : undefined;
      return ic
        ? { id: wire.id, type: "db:columns", payload: { ...ic.db, table: tableName ?? ic.mapping.table } }
        : null;
    }
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
