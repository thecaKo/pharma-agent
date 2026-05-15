import type { DbConfig, DbDriver, ImportConfig, ProductMapping } from "../types";

export type NeoAgentConfigResponse = {
  agentId?: string;
  storeId?: string;
  database: NeoDatabaseRow | null;
  mapping: NeoMappingRow | null;
};

type NeoDatabaseRow = {
  driver?: string | null;
  host?: string | null;
  port?: number | null;
  databasePath?: string | null;
  databaseName?: string | null;
  username?: string | null;
  password?: string | null;
  encryptedPassword?: string | null;
  selectedTable?: string | null;
  connectionMode?: string | null;
};

type NeoMappingRow = {
  tableName?: string | null;
  idField?: string | null;
  nameField?: string | null;
  priceField?: string | null;
  stockField?: string | null;
  barcodeField?: string | null;
  unitField?: string | null;
  updatedAtField?: string | null;
  active?: number | boolean | null;
};

function asDriver(raw: string | null | undefined): DbDriver {
  const d = (raw ?? "firebird").toLowerCase();
  if (
    d === "mysql" ||
    d === "firebird" ||
    d === "postgresql" ||
    d === "sqlserver" ||
    d === "sqlite" ||
    d === "oracle" ||
    d === "interbase"
  ) {
    return d;
  }
  return "firebird";
}

function defaultPort(driver: DbDriver): number {
  switch (driver) {
    case "mysql":
      return 3306;
    case "postgresql":
      return 5432;
    case "sqlserver":
      return 1433;
    case "oracle":
      return 1521;
    case "firebird":
    case "interbase":
      return 3050;
    default:
      return 0;
  }
}

function pick<T>(r: Record<string, unknown>, camel: string, snake: string): T | undefined {
  const v = r[camel] ?? r[snake];
  return v as T | undefined;
}

function trimOpt(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function normalizeDbPayload(raw: unknown): NeoDatabaseRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    driver: pick(r, "driver", "driver") ?? null,
    host: pick(r, "host", "host") ?? null,
    port: (pick(r, "port", "port") as number | null | undefined) ?? null,
    databasePath: pick(r, "databasePath", "database_path") ?? null,
    databaseName: pick(r, "databaseName", "database_name") ?? null,
    username: pick(r, "username", "username") ?? null,
    password: pick(r, "password", "password") ?? null,
    encryptedPassword: pick(r, "encryptedPassword", "encrypted_password") ?? null,
    selectedTable: pick(r, "selectedTable", "selected_table") ?? null,
    connectionMode: pick(r, "connectionMode", "connection_mode") ?? null
  };
}

function normalizeMappingPayload(raw: unknown): NeoMappingRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    tableName: pick(r, "tableName", "table_name") ?? null,
    idField: pick(r, "idField", "id_field") ?? null,
    nameField: pick(r, "nameField", "name_field") ?? null,
    priceField: pick(r, "priceField", "price_field") ?? null,
    stockField: pick(r, "stockField", "stock_field") ?? null,
    barcodeField: pick(r, "barcodeField", "barcode_field") ?? null,
    unitField: pick(r, "unitField", "unit_field") ?? null,
    updatedAtField: pick(r, "updatedAtField", "updated_at_field") ?? null,
    active: pick(r, "active", "active") ?? null
  };
}

function unwrapConfigEnvelope(body: unknown): { database: unknown; mapping: unknown } | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const inner =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root.item && typeof root.item === "object"
        ? (root.item as Record<string, unknown>)
        : root;
  return {
    database: inner.database,
    mapping: inner.mapping
  };
}

export function neoResponseToImportConfig(body: unknown): ImportConfig | null {
  const env = unwrapConfigEnvelope(body);
  if (!env) return null;
  const dbRow = normalizeDbPayload(env.database);
  const mapRow = normalizeMappingPayload(env.mapping);
  if (!dbRow || !mapRow) {
    return null;
  }
  const driver = asDriver(dbRow.driver);
  const secret = dbRow.password ?? dbRow.encryptedPassword ?? "";
  const mode = String(dbRow.connectionMode ?? "")
    .trim()
    .toLowerCase();
  const useName = mode === "name" || mode === "database";
  const dbPath = String(dbRow.databasePath ?? "").trim();
  const dbName = String(dbRow.databaseName ?? "").trim();
  const resolvedDb = useName ? dbName : dbPath || dbName;
  const db: DbConfig = {
    driver,
    host: dbRow.host ?? "localhost",
    port: dbRow.port != null && dbRow.port > 0 ? dbRow.port : defaultPort(driver),
    database: resolvedDb,
    user: dbRow.username ?? "",
    password: typeof secret === "string" ? secret : ""
  };
  if (!db.database) {
    return null;
  }
  const table = (mapRow.tableName || dbRow.selectedTable || "").trim();
  if (!table) {
    return null;
  }
  const idField = (mapRow.idField || "").trim();
  const nameField = (mapRow.nameField || "").trim();
  if (!nameField) {
    return null;
  }
  const mapping: ProductMapping = {
    table,
    idField: idField || undefined,
    nameField,
    priceField: trimOpt(mapRow.priceField),
    stockField: trimOpt(mapRow.stockField),
    barcodeField: trimOpt(mapRow.barcodeField)
  };
  return { db, mapping };
}
