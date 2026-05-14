import { listColumns } from "../db";
import { DbConfig } from "../types";

export async function runColumns(config: DbConfig & { table: string }): Promise<{ columns: string[] }> {
  const columns = await listColumns(config, config.table);
  return { columns };
}
