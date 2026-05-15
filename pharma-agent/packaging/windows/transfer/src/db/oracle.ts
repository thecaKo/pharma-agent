import oracledb from "oracledb";
import { DbConfig, ImportConfig, NormalizedProduct } from "../types";
import { normalizeProduct } from "./normalize";

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

export async function testOracleConnection(config: DbConfig): Promise<void> {
  const connection = await createOracleConnection(config);
  try {
    await connection.execute("SELECT 1 FROM DUAL");
  } finally {
    await connection.close();
  }
}

export async function listOracleTables(config: DbConfig): Promise<string[]> {
  const connection = await createOracleConnection(config);
  try {
    const result = await connection.execute(`
      SELECT OWNER || '.' || TABLE_NAME AS NAME
      FROM ALL_TABLES
      WHERE OWNER NOT IN ('SYS', 'SYSTEM')
      ORDER BY OWNER, TABLE_NAME
    `);
    return ((result.rows ?? []) as Array<Record<string, unknown>>).map((row) => String(row.NAME));
  } finally {
    await connection.close();
  }
}

export async function listOracleColumns(config: DbConfig, table: string): Promise<string[]> {
  const connection = await createOracleConnection(config);
  const { owner, name } = splitOracleTable(table, config.user);
  try {
    const result = await connection.execute(`
      SELECT COLUMN_NAME AS NAME
      FROM ALL_TAB_COLUMNS
      WHERE OWNER = :owner AND TABLE_NAME = :table
      ORDER BY COLUMN_ID
    `, { owner: owner.toUpperCase(), table: name.toUpperCase() });
    return ((result.rows ?? []) as Array<Record<string, unknown>>).map((row) => String(row.NAME));
  } finally {
    await connection.close();
  }
}

export async function importOracleProducts(config: ImportConfig): Promise<NormalizedProduct[]> {
  const connection = await createOracleConnection(config.db);
  try {
    const result = await connection.execute(`SELECT * FROM ${escapeOracleTable(config.mapping.table, config.db.user)}`);
    return ((result.rows ?? []) as Array<Record<string, unknown>>).map((row) => normalizeProduct(row, config));
  } finally {
    await connection.close();
  }
}

function createOracleConnection(config: DbConfig) {
  return oracledb.getConnection({
    user: config.user,
    password: config.password,
    connectString: `${config.host}:${config.port}/${config.database}`
  });
}

function splitOracleTable(table: string, user: string) {
  const parts = table.split(".");
  if (parts.length >= 2) {
    return { owner: parts[0], name: parts.slice(1).join(".") };
  }
  return { owner: user, name: table };
}

function escapeOracleTable(table: string, user: string) {
  const { owner, name } = splitOracleTable(table, user);
  return `${escapeOracleIdentifier(owner)}.${escapeOracleIdentifier(name)}`;
}

function escapeOracleIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, "\"\"").toUpperCase()}"`;
}
