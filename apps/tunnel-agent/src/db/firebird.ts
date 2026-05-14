import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DbConfig, ImportConfig, NormalizedProduct } from "../types";

type FirebirdDatabase = {
  query(sql: string, params: unknown[], callback: (error: Error | null, rows?: unknown[]) => void): void;
  detach(callback?: () => void): void;
};

type FirebirdModule = {
  attach(
    options: Record<string, unknown>,
    callback: (error: Error | null, database?: FirebirdDatabase) => void
  ): void;
};

const Firebird = require("node-firebird") as FirebirdModule;

export async function testFirebirdConnection(config: DbConfig): Promise<void> {
  if (shouldPreferIsql()) {
    try {
      await testFirebirdConnectionWithIsql(config);
      return;
    } catch (error) {
      if (shouldRequireIsql(config)) {
        throw new Error(`Falha ao testar Firebird via isql-fb: ${formatError(error)}`);
      }
      console.warn(`Falha ao testar Firebird via isql-fb, tentando node-firebird: ${formatError(error)}`);
    }
  }

  const database = await attach(config);
  database.detach();
}

export async function listFirebirdTables(config: DbConfig): Promise<string[]> {
  if (shouldPreferIsql()) {
    try {
      return await listFirebirdTablesWithIsql(config);
    } catch (error) {
      if (shouldRequireIsql(config)) {
        throw new Error(`Falha ao listar tabelas Firebird via isql-fb: ${formatError(error)}`);
      }
      console.warn(`Falha ao listar tabelas via isql-fb, tentando node-firebird: ${formatError(error)}`);
    }
  }

  const database = await attach(config);
  try {
    const rows = await query<{ name: string }>(
      database,
      "SELECT TRIM(RDB$RELATION_NAME) AS name FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 ORDER BY RDB$RELATION_NAME",
      []
    );
    return rows.map((row) => row.name.trim()).filter(Boolean);
  } finally {
    database.detach();
  }
}

export async function listFirebirdColumns(config: DbConfig, table: string): Promise<string[]> {
  if (shouldPreferIsql()) {
    try {
      return await listFirebirdColumnsWithIsql(config, table);
    } catch (error) {
      if (shouldRequireIsql(config)) {
        throw new Error(`Falha ao listar colunas Firebird via isql-fb: ${formatError(error)}`);
      }
      console.warn(`Falha ao listar colunas via isql-fb, tentando node-firebird: ${formatError(error)}`);
    }
  }

  const database = await attach(config);
  try {
    const rows = await query<{ name: string }>(
      database,
      "SELECT TRIM(RDB$FIELD_NAME) AS name FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = ? ORDER BY RDB$FIELD_POSITION",
      [table.toUpperCase()]
    );
    return rows.map((row) => row.name.trim()).filter(Boolean);
  } finally {
    database.detach();
  }
}

export async function importFirebirdProducts(config: ImportConfig): Promise<NormalizedProduct[]> {
  if (shouldPreferIsql()) {
    try {
      return await importFirebirdProductsWithIsql(config);
    } catch (error) {
      if (shouldRequireIsql(config.db)) {
        throw new Error(`Falha ao importar produtos Firebird via isql-fb: ${formatError(error)}`);
      }
      console.warn(`Falha ao importar via isql-fb, tentando node-firebird: ${formatError(error)}`);
    }
  }

  const database = await attach(config.db);
  try {
    const table = toFirebirdIdentifier(config.mapping.table);
    const rows = await query<Record<string, unknown>>(database, `SELECT * FROM ${table}`, []);
    return rows.map((row) => normalizeProduct(normalizeRowKeys(row), config));
  } finally {
    database.detach();
  }
}

async function testFirebirdConnectionWithIsql(config: DbConfig): Promise<void> {
  await runIsql(config, "SELECT 1 FROM RDB$DATABASE;");
}

async function listFirebirdTablesWithIsql(config: DbConfig): Promise<string[]> {
  const output = await runIsql(config, `
SET LIST ON;
SET HEADING OFF;
SELECT TRIM(RDB$RELATION_NAME) AS ITEM_VALUE
FROM RDB$RELATIONS
WHERE RDB$SYSTEM_FLAG = 0
ORDER BY RDB$RELATION_NAME;
`);
  return parseIsqlListRows(output).map((row) => row.ITEM_VALUE).filter(Boolean);
}

async function listFirebirdColumnsWithIsql(config: DbConfig, table: string): Promise<string[]> {
  const output = await runIsql(config, `
SET LIST ON;
SET HEADING OFF;
SELECT TRIM(RDB$FIELD_NAME) AS ITEM_VALUE
FROM RDB$RELATION_FIELDS
WHERE RDB$RELATION_NAME = '${escapeSqlString(table.toUpperCase())}'
ORDER BY RDB$FIELD_POSITION;
`);
  return parseIsqlListRows(output).map((row) => row.ITEM_VALUE).filter(Boolean);
}

async function importFirebirdProductsWithIsql(config: ImportConfig): Promise<NormalizedProduct[]> {
  const { mapping } = config;
  const table = toFirebirdIdentifier(mapping.table);
  const fields = [
    mapping.idField ? `${toFirebirdIdentifier(mapping.idField)} AS EXTERNAL_ID` : "CAST(NULL AS VARCHAR(80)) AS EXTERNAL_ID",
    `${toFirebirdIdentifier(mapping.nameField)} AS NAME`,
    mapping.priceField ? `${toFirebirdIdentifier(mapping.priceField)} AS PRICE` : "CAST(NULL AS NUMERIC(12,2)) AS PRICE",
    mapping.stockField ? `${toFirebirdIdentifier(mapping.stockField)} AS STOCK` : "CAST(NULL AS INTEGER) AS STOCK",
    mapping.imageField ? `${toFirebirdIdentifier(mapping.imageField)} AS IMAGE` : "CAST(NULL AS VARCHAR(255)) AS IMAGE"
  ];
  const output = await runIsql(config.db, `
SET LIST ON;
SET HEADING OFF;
SELECT ${fields.join(", ")}
FROM ${table};
`);
  return parseIsqlListRows(output).map((row) => ({
    name: asString(row.NAME),
    externalId: asOptionalString(row.EXTERNAL_ID),
    price: asOptionalNumber(row.PRICE),
    stock: asOptionalNumber(row.STOCK),
    image: asOptionalString(row.IMAGE)
  }));
}

async function runIsql(config: DbConfig, sql: string): Promise<string> {
  const binary = resolveIsqlBinary();
  if (!binary) {
    throw new Error("isql-fb nao encontrado no PATH nem nos caminhos conhecidos.");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pharma-isql-"));
  const inputFile = path.join(tempDir, "query.sql");
  await fs.writeFile(inputFile, `${sql.trim()}\nQUIT;\n`, "utf8");

  try {
    return await execIsql(binary, [
      resolveIsqlDatabase(config),
      "-user",
      config.user,
      "-password",
      config.password,
      "-q",
      "-i",
      inputFile
    ]);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function execIsql(binary: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(binary, args, {
      env: {
        ...process.env,
        FIREBIRD_LOCK: process.env.FIREBIRD_LOCK,
        FIREBIRD: process.env.FIREBIRD
      },
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024
    }, (error, stdout, stderr) => {
      const output = `${stdout}${stderr}`;
      if (error) {
        reject(new Error(output.trim() || error.message));
        return;
      }
      resolve(output);
    });
  });
}

function resolveIsqlDatabase(config: DbConfig): string {
  if (isLocalHost(config.host) && path.isAbsolute(config.database) && existsSync(config.database)) {
    return config.database;
  }
  return `${config.host}/${config.port}:${config.database}`;
}

function resolveIsqlBinary(): string | null {
  const candidates = [
    process.env.PHARMA_FIREBIRD_ISQL,
    "isql-fb",
    "/usr/bin/isql-fb",
    "/usr/lib/firebird/4.0/bin/isql-fb",
    "/usr/lib/firebird/3.0/bin/isql-fb",
    "/opt/firebird/bin/isql"
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (candidate.includes("/") && !existsSync(candidate)) {
      continue;
    }
    return candidate;
  }

  return null;
}

function shouldPreferIsql(): boolean {
  return process.env.PHARMA_FIREBIRD_DRIVER !== "node";
}

function shouldRequireIsql(config: DbConfig): boolean {
  return process.env.PHARMA_FIREBIRD_DRIVER === "isql" || isLocalFirebirdFile(config);
}

function isLocalFirebirdFile(config: DbConfig): boolean {
  return isLocalHost(config.host) && path.isAbsolute(config.database);
}

function parseIsqlListRows(output: string): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];
  let current: Record<string, string> = {};

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (Object.keys(current).length) {
        rows.push(current);
        current = {};
      }
      continue;
    }

    const match = line.match(/^([A-Z][A-Z0-9_]*)\s+(.*)$/);
    if (match) {
      current[match[1]] = match[2].trim();
    }
  }

  if (Object.keys(current).length) {
    rows.push(current);
  }

  return rows;
}

function isLocalHost(host: string): boolean {
  return ["", "localhost", "127.0.0.1", "::1"].includes(host.trim().toLowerCase());
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function attach(config: DbConfig): Promise<FirebirdDatabase> {
  return new Promise((resolve, reject) => {
    Firebird.attach(
      {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        lowercase_keys: false,
        role: null,
        pageSize: 4096
      },
      (error, database) => {
        if (error || !database) {
          reject(error ?? new Error("Falha ao abrir conexao Firebird"));
          return;
        }
        resolve(database);
      }
    );
  });
}

function query<T>(database: FirebirdDatabase, sql: string, params: unknown[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    database.query(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve((rows ?? []) as T[]);
    });
  });
}

function toFirebirdIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(identifier)) {
    throw new Error(`Identificador Firebird invalido: ${identifier}`);
  }
  return identifier.toUpperCase();
}

function normalizeRowKeys(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim()] = value;
    normalized[key.trim().toLowerCase()] = value;
  }
  return normalized;
}

function normalizeProduct(row: Record<string, unknown>, config: ImportConfig): NormalizedProduct {
  const { mapping } = config;
  return {
    externalId: asOptionalString(mapping.idField ? readMapped(row, mapping.idField) : undefined),
    name: asString(readMapped(row, mapping.nameField)),
    price: asOptionalNumber(mapping.priceField ? readMapped(row, mapping.priceField) : undefined),
    stock: asOptionalNumber(mapping.stockField ? readMapped(row, mapping.stockField) : undefined),
    image: asOptionalString(mapping.imageField ? readMapped(row, mapping.imageField) : undefined)
  };
}

function readMapped(row: Record<string, unknown>, field: string): unknown {
  return row[field] ?? row[field.toUpperCase()] ?? row[field.toLowerCase()];
}

function asString(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function asOptionalString(value: unknown): string | undefined {
  const normalized = asString(value);
  return normalized || undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
