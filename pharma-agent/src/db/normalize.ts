import { ImportConfig, NormalizedProduct } from "../types";

export function normalizeProduct(row: Record<string, unknown>, config: ImportConfig): NormalizedProduct {
  const { mapping } = config;
  return {
    externalId: mapping.idField ? asOptionalString(row[mapping.idField]) : undefined,
    name: asString(row[mapping.nameField]),
    price: asOptionalNumber(mapping.priceField ? row[mapping.priceField] : undefined),
    stock: asOptionalNumber(mapping.stockField ? row[mapping.stockField] : undefined),
    image: asOptionalString(mapping.imageField ? row[mapping.imageField] : undefined)
  };
}

export function asString(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

export function asOptionalString(value: unknown): string | undefined {
  const normalized = asString(value);
  return normalized || undefined;
}

export function asOptionalNumber(value: unknown): number | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
