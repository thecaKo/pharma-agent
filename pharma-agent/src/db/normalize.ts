import { ImportConfig, NormalizedProduct } from "../types";

function isMapped(field?: string): boolean {
  return typeof field === "string" && field.trim().length > 0;
}

function pickRowValue(row: Record<string, unknown>, field?: string): unknown {
  if (field == null) return undefined;
  const key = String(field).trim();
  if (!key) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  const lower = key.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === lower) return row[k];
  }
  return undefined;
}

export function normalizeProduct(row: Record<string, unknown>, config: ImportConfig): NormalizedProduct {
  const { mapping } = config;
  const rawId = isMapped(mapping.idField) ? pickRowValue(row, mapping.idField) : undefined;
  const rawName = isMapped(mapping.nameField) ? pickRowValue(row, mapping.nameField) : undefined;
  const rawBarcode = isMapped(mapping.barcodeField) ? pickRowValue(row, mapping.barcodeField) : undefined;
  const externalId = isMapped(mapping.idField) ? asOptionalString(rawId) : undefined;
  const name = asString(rawName);

  return {
    externalId,
    name,
    price: isMapped(mapping.priceField)
      ? asOptionalNumber(pickRowValue(row, mapping.priceField))
      : undefined,
    stock: isMapped(mapping.stockField)
      ? asOptionalNumber(pickRowValue(row, mapping.stockField))
      : undefined,
    barcode: isMapped(mapping.barcodeField) ? asOptionalString(rawBarcode) : undefined,
    image: isMapped(mapping.imageField) ? asOptionalString(pickRowValue(row, mapping.imageField)) : undefined
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
