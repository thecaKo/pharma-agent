import { importProducts } from "../db";
import { ImportConfig, ImportResult, NormalizedProduct } from "../types";

export async function runImportProducts(config: ImportConfig): Promise<ImportResult> {
  validateImportConfig(config);

  const products = await importProducts(config);
  const result: ImportResult = {
    totalRows: products.length,
    successRows: 0,
    failedRows: 0,
    logs: [],
    products: []
  };

  products.forEach((product, index) => {
    if (!product.name) {
      result.failedRows += 1;
      pushLog(result.logs, `Linha ${index + 1}: falha - nome vazio`);
      return;
    }

    const normalized = cleanProduct(product);
    result.successRows += 1;
    result.products.push(normalized);
    pushLog(result.logs, `Linha ${index + 1}: ${JSON.stringify(normalized)}`);
  });

  if (result.successRows > result.logs.length) {
    result.logs.push(`... ${result.successRows - result.logs.length} produtos omitidos dos logs.`);
  }

  return result;
}

function validateImportConfig(config: ImportConfig): void {
  if (!config.mapping.table) {
    throw new Error("Mapping invalido: tabela obrigatoria");
  }
  if (!config.mapping.nameField) {
    throw new Error("Mapping invalido: campo de nome obrigatorio");
  }
}

function cleanProduct(product: NormalizedProduct): NormalizedProduct {
  return Object.fromEntries(
    Object.entries(product).filter(([, value]) => value !== undefined && value !== "")
  ) as NormalizedProduct;
}

function pushLog(logs: string[], message: string): void {
  if (logs.length < 200) {
    logs.push(message);
  }
}
