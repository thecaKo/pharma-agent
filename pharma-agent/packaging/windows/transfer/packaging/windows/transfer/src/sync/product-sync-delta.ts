import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import { pushProductSnapshot } from "../api/push-snapshot";
import { getConfigPath } from "../config/local-config";
import type { LocalConfig, NormalizedProduct } from "../types";
import { externalProductKey, fingerprintNormalizedProduct } from "./snapshot-fingerprint";

type PersistedState = { v: 1; fingerprints: Record<string, string> };

function stateKey(config: LocalConfig): string {
  const id = config.agentId?.trim();
  if (id) return id;
  return createHash("sha256").update(config.token).digest("hex").slice(0, 16);
}

function fingerprintsPath(config: LocalConfig): string {
  const dir = path.dirname(getConfigPath());
  return path.join(dir, `.pharma-product-sync-${stateKey(config)}.json`);
}

export async function loadSyncFingerprints(config: LocalConfig): Promise<Map<string, string>> {
  try {
    const raw = await fs.readFile(fingerprintsPath(config), "utf8");
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed?.v !== 1 || typeof parsed.fingerprints !== "object" || !parsed.fingerprints) {
      return new Map();
    }
    return new Map(Object.entries(parsed.fingerprints));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new Map();
    }
    return new Map();
  }
}

async function saveSyncFingerprints(config: LocalConfig, fingerprints: Map<string, string>): Promise<void> {
  const payload: PersistedState = { v: 1, fingerprints: Object.fromEntries(fingerprints) };
  const filePath = fingerprintsPath(config);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

export function computePushDelta(
  products: NormalizedProduct[],
  previous: Map<string, string>
): { toPush: NormalizedProduct[]; nextFingerprints: Map<string, string> } {
  const nextFingerprints = new Map<string, string>();
  const toPush: NormalizedProduct[] = [];
  for (const p of products) {
    const key = externalProductKey(p);
    if (!key) continue;
    const fp = fingerprintNormalizedProduct(p);
    nextFingerprints.set(key, fp);
    if (previous.get(key) !== fp) {
      toPush.push(p);
    }
  }
  return { toPush, nextFingerprints };
}

export async function pushProductSnapshotDelta(
  config: LocalConfig,
  products: NormalizedProduct[]
): Promise<{ pushed: number; total: number }> {
  const previous = await loadSyncFingerprints(config);
  const { toPush, nextFingerprints } = computePushDelta(products, previous);
  console.log(`[products:sync] delta enviar ${toPush.length}/${products.length}`);

  if (toPush.length === 0) {
    await saveSyncFingerprints(config, nextFingerprints);
    return { pushed: 0, total: products.length };
  }

  const ok = await pushProductSnapshot(config, toPush);
  if (ok) {
    await saveSyncFingerprints(config, nextFingerprints);
  }
  return { pushed: toPush.length, total: products.length };
}
