import Database from "better-sqlite3";
import { DbConfig, ImportConfig, NormalizedProduct } from "../types";
import { normalizeProduct } from "./normalize";

export async function testSqliteConnection(config: DbConfig): Promise<void> {
  const database = openSqliteDatabase(config);
  try {
    database.prepare("SELECT 1").get();
  } finally {
    database.close();
  }
}

export async function listSqliteTables(config: DbConfig): Promise<string[]> {
  const database = openSqliteDatabase(config);
  try {
    const rows = database.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as Array<{ name: string }>;
    return rows.map((row) => row.name);
  } finally {
    database.close();
  }
}

export async function listSqliteColumns(config: DbConfig, table: string): Promise<string[]> {
  const database = openSqliteDatabase(config);
  try {
    const rows = database.prepare(`PRAGMA table_info(${escapeSqliteIdentifier(table)})`).all() as Array<{ name: string }>;
    return rows.map((row) => row.name);
  } finally {
    database.close();
  }
}

export async function importSqliteProducts(config: ImportConfig): Promise<NormalizedProduct[]> {
  const database = openSqliteDatabase(config.db);
  try {
    const rows = database.prepare(`SELECT * FROM ${escapeSqliteIdentifier(config.mapping.table)}`).all() as Array<Record<string, unknown>>;
    return rows.map((row) => normalizeProduct(row, config));
  } finally {
    database.close();
  }
}

function openSqliteDatabase(config: DbConfig) {
  return new Database(config.database, {
    readonly: true,
    fileMustExist: true
  });
}

function escapeSqliteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}
