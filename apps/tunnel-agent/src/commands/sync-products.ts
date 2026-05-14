import { importProducts } from "../db";
import { ImportConfig, ProductSyncResult } from "../types";

export async function runSyncProducts(config: ImportConfig): Promise<ProductSyncResult> {
  validateSyncConfig(config);

  const products = (await importProducts(config)).filter((product) => product.externalId && product.name);
  const logs = [
    `Sync snapshot: driver=${config.db.driver} database=${config.db.database} table=${config.mapping.table} total=${products.length}`
  ];
  console.log(`[products:sync] ${logs[0]}`);

  return {
    totalRows: products.length,
    products,
    created: [],
    updated: [],
    removed: [],
    unchanged: 0,
    logs
  };
}

function validateSyncConfig(config: ImportConfig): void {
  if (!config.mapping.table) {
    throw new Error("Mapping invalido: tabela obrigatoria");
  }
  if (!config.mapping.idField) {
    throw new Error("Mapping invalido: campo ID obrigatorio para sync");
  }
  if (!config.mapping.nameField) {
    throw new Error("Mapping invalido: campo de nome obrigatorio");
  }
}
