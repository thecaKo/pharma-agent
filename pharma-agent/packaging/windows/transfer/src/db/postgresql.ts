import { Client } from "pg";
import { DbConfig, ImportConfig, NormalizedProduct } from "../types";
import { normalizeProduct } from "./normalize";

export async function testPostgresqlConnection(config: DbConfig): Promise<void> {
  const client = createPostgresqlClient(config);
  try {
    await client.connect();
    await client.query("SELECT 1");
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function listPostgresqlTables(config: DbConfig): Promise<string[]> {
  const client = createPostgresqlClient(config);
  try {
    await client.connect();
    const result = await client.query(`
      SELECT table_schema || '.' || table_name AS name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);
    return result.rows.map((row) => String(row.name));
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function listPostgresqlColumns(config: DbConfig, table: string): Promise<string[]> {
  const client = createPostgresqlClient(config);
  const { schema, name } = splitPostgresqlTable(table);
  try {
    await client.connect();
    const result = await client.query(`
      SELECT column_name AS name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [schema, name]);
    return result.rows.map((row) => String(row.name));
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function importPostgresqlProducts(config: ImportConfig): Promise<NormalizedProduct[]> {
  const client = createPostgresqlClient(config.db);
  try {
    await client.connect();
    const result = await client.query(`SELECT * FROM ${escapePostgresqlTable(config.mapping.table)}`);
    return result.rows.map((row) => normalizeProduct(row, config));
  } finally {
    await client.end().catch(() => undefined);
  }
}

function createPostgresqlClient(config: DbConfig) {
  return new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password
  });
}

function splitPostgresqlTable(table: string) {
  const parts = table.split(".");
  if (parts.length >= 2) {
    return { schema: parts[0], name: parts.slice(1).join(".") };
  }
  return { schema: "public", name: table };
}

function escapePostgresqlTable(table: string) {
  const { schema, name } = splitPostgresqlTable(table);
  return `${escapePostgresqlIdentifier(schema)}.${escapePostgresqlIdentifier(name)}`;
}

function escapePostgresqlIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, "\"\"")}"`;
}
