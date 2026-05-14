import { listTables } from "../db";
import { DbConfig } from "../types";

const CANDIDATE_TABLES = new Set(["produtos", "produto", "products", "product", "estoque", "itens", "items"]);

export async function runSchema(config: DbConfig): Promise<{ tables: string[]; candidates: string[] }> {
  const tables = await listTables(config);
  const candidates = tables.filter((table) => CANDIDATE_TABLES.has(table.toLowerCase()));
  return { tables, candidates };
}
