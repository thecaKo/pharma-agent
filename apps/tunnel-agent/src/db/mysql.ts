import mysql from "mysql2/promise";
import { DbConfig, ImportConfig, NormalizedProduct } from "../types";
import { normalizeProduct } from "./normalize";

export async function testMysqlConnection(config: DbConfig): Promise<void> {
  const connection = await createMysqlConnection(config);
  try {
    await connection.ping();
  } finally {
    await connection.end();
  }
}

export async function listMysqlTables(config: DbConfig): Promise<string[]> {
  const connection = await createMysqlConnection(config);
  try {
    const [rows] = await connection.query(
      "SELECT TABLE_NAME AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY TABLE_NAME"
    );
    return (rows as Array<{ name: string }>).map((row) => row.name);
  } finally {
    await connection.end();
  }
}

export async function listMysqlColumns(config: DbConfig, table: string): Promise<string[]> {
  const connection = await createMysqlConnection(config);
  try {
    const [rows] = await connection.execute(
      "SELECT COLUMN_NAME AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ORDINAL_POSITION",
      [table]
    );
    return (rows as Array<{ name: string }>).map((row) => row.name);
  } finally {
    await connection.end();
  }
}

export async function importMysqlProducts(config: ImportConfig): Promise<NormalizedProduct[]> {
  const connection = await createMysqlConnection(config.db);
  try {
    const table = escapeMysqlIdentifier(config.mapping.table);
    const [rows] = await connection.query(`SELECT * FROM ${table}`);
    return (rows as Array<Record<string, unknown>>).map((row) => normalizeProduct(row, config));
  } finally {
    await connection.end();
  }
}

function createMysqlConnection(config: DbConfig) {
  return mysql.createConnection({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password
  });
}

function escapeMysqlIdentifier(identifier: string): string {
  return `\`${identifier.replace(/`/g, "``")}\``;
}
