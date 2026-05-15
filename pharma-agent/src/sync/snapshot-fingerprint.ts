import { productSourceHash } from "../api/command-result";
import type { NormalizedProduct } from "../types";

export function externalProductKey(p: NormalizedProduct): string {
  const id = p.externalId?.trim();
  if (id) return id;
  return p.name.trim();
}

export function fingerprintNormalizedProduct(p: NormalizedProduct): string {
  const externalProductId = externalProductKey(p);
  return productSourceHash({
    externalProductId,
    name: p.name,
    price: p.price,
    stock: p.stock,
    barcode: p.barcode
  });
}
