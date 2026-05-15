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
    const rowArr = rows as Array<Record<string, unknown>>;
    logMysqlImportSample(config, rowArr);
    return rowArr.map((row) => normalizeProduct(row, config));
  } finally {
    await connection.end();
  }
}

function summarizarValor(v: unknown): string {
  if (v == null) {
    return String(v);
  }
  if (typeof v === "object") {
    try {
      const s = JSON.stringify(v);
      return s.length > 160 ? `${s.slice(0, 160)}…` : s;
    } catch {
      return "[object]";
    }
  }
  const s = String(v);
  return s.length > 160 ? `${s.slice(0, 160)}…` : s;
}

function logMysqlImportSample(
  config: ImportConfig,
  rowArr: Array<Record<string, unknown>>,
): void {
  const first = rowArr[0];
  const ik = config.mapping.idField?.trim();
  const nk = config.mapping.nameField?.trim();
  if (!first) {
    console.log(
      `[mysql import] table=${config.mapping.table} rows=0 idField_cfg=${JSON.stringify(ik)} nameField_cfg=${JSON.stringify(nk)}`
    );
    return;
  }
  const keys = Object.keys(first);
  const findCi = (want?: string) =>
    want ? keys.find((k) => k.toLowerCase() === want.toLowerCase()) : undefined;
  const idKey = findCi(ik);
  const nameKey = findCi(nk);
  console.log(
    `[mysql import] table=${config.mapping.table} rows=${rowArr.length} idField_cfg=${JSON.stringify(ik)} nameField_cfg=${JSON.stringify(nk)} columns=${JSON.stringify(keys)} id_col_match=${JSON.stringify(idKey)} name_col_match=${JSON.stringify(nameKey)} id_raw=${summarizarValor(idKey !== undefined ? first[idKey] : undefined)} name_raw=${summarizarValor(nameKey !== undefined ? first[nameKey] : undefined)}`
  );
  if (nk && nameKey === undefined) {
    const hints = ["name", "public_name", "nome", "descricao", "description"].filter((c) =>
      keys.some((k) => k.toLowerCase() === c.toLowerCase()),
    );
    console.warn(
      `[mysql import] Coluna de nome "${nk}" não existe no resultado. Corrija o mapeamento no painel (ex.: ${hints.length ? hints.join(", ") : keys.slice(0, 8).join(", ") + (keys.length > 8 ? ", …" : "")}).`
    );
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
