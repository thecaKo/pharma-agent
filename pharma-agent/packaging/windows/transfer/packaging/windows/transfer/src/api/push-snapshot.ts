import type { NormalizedProduct } from "../types";
import { externalProductKey, fingerprintNormalizedProduct } from "../sync/snapshot-fingerprint";
import { NEO_AGENT_PRODUCTS_SNAPSHOT_PATH, neoBearerHeaders, resolveNeoPath } from "./neo-http";
import type { LocalConfig } from "../types";

export async function pushProductSnapshot(
  config: LocalConfig,
  products: NormalizedProduct[]
): Promise<boolean> {
  if (!products.length) {
    return true;
  }
  const path =
    process.env.PHARMA_AGENT_PRODUCTS_SNAPSHOT_PATH?.trim() || NEO_AGENT_PRODUCTS_SNAPSHOT_PATH;
  const url = resolveNeoPath(path, config);
  const body = JSON.stringify({
    products: products.map((p) => {
      const externalProductId = externalProductKey(p);
      return {
        externalProductId,
        barcode: p.barcode,
        name: p.name,
        price: p.price,
        stock: p.stock,
        sourceHash: fingerprintNormalizedProduct(p)
      };
    })
  });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...neoBearerHeaders(config),
        "content-type": "application/json"
      },
      body
    });
    return res.ok;
  } catch {
    return false;
  }
}
