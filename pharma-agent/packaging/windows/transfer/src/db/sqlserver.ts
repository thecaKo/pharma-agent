import sql from "mssql";
import { DbConfig, ImportConfig, NormalizedProduct } from "../types";
import { normalizeProduct } from "./normalize";

export async function testSqlserverConnection(config: DbConfig): Promise<void> {
  const pool = await createSqlserverPool(config);
  try {
    await pool.request().query("SELECT 1 AS ok");
  } finally {
    await pool.close();
  }
}

export async function listSqlserverTables(config: DbConfig): Promise<string[]> {
  const pool = await createSqlserverPool(config);
  try {
    const result = await pool.request().query(`
      SELECT TABLE_SCHEMA + '.' + TABLE_NAME AS name
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);
    return result.recordset.map((row) => String(row.name));
  } finally {
    await pool.close();
  }
}

export async function listSqlserverColumns(config: DbConfig, table: string): Promise<string[]> {
  const pool = await createSqlserverPool(config);
  const { schema, name } = splitSqlserverTable(table);
  try {
    const result = await pool.request()
      .input("schema", sql.NVarChar, schema)
      .input("table", sql.NVarChar, name)
      .query(`
        SELECT COLUMN_NAME AS name
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @table
        ORDER BY ORDINAL_POSITION
      `);
    return result.recordset.map((row) => String(row.name));
  } finally {
    await pool.close();
  }
}

export async function importSqlserverProducts(config: ImportConfig): Promise<NormalizedProduct[]> {
  const pool = await createSqlserverPool(config.db);
  try {
    const result = await pool.request().query(`SELECT * FROM ${escapeSqlserverTable(config.mapping.table)}`);
    return result.recordset.map((row) => normalizeProduct(row as Record<string, unknown>, config));
  } finally {
    await pool.close();
  }
}

async function createSqlserverPool(config: DbConfig) {
  const pool = new sql.ConnectionPool({
    server: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    options: {
      encrypt: process.env.PHARMA_SQLSERVER_ENCRYPT === "true",
      trustServerCertificate: process.env.PHARMA_SQLSERVER_TRUST_CERT !== "false"
    }
  });
  return pool.connect();
}

function splitSqlserverTable(table: string) {
  const parts = table.split(".");
  if (parts.length >= 2) {
    return { schema: parts[0], name: parts.slice(1).join(".") };
  }
  return { schema: "dbo", name: table };
}

function escapeSqlserverTable(table: string) {
  const { schema, name } = splitSqlserverTable(table);
  return `${escapeSqlserverIdentifier(schema)}.${escapeSqlserverIdentifier(name)}`;
}

function escapeSqlserverIdentifier(identifier: string) {
  return `[${identifier.replace(/]/g, "]]")}]`;
}
