import { importProducts } from "../db";
import { ImportConfig, ProductSyncResult } from "../types";

export async function runSyncProducts(config: ImportConfig): Promise<ProductSyncResult> {
  validateSyncConfig(config);

  const imported = await importProducts(config);
  const products = imported.filter((product) => product.name.trim().length > 0);
  if (imported.length > 0 && products.length === 0) {
    console.warn(
      `[products:sync] ${imported.length} linhas em "${config.mapping.table}"; 0 com nome após mapeamento (coluna "${config.mapping.nameField}" vazia/inexistente ou tabela só referência/imagem — use tabela/view com nome do produto)`
    );
  }
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
  if (!config.mapping.nameField?.trim()) {
    throw new Error("Mapping invalido: campo de nome obrigatorio");
  }
}
