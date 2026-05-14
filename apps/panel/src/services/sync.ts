import { prisma } from "@/db/prisma";
import { getAgent } from "@/services/agents";
import { syncProducts } from "@/services/commands";
import { toDbConfig } from "@/services/database-configs";
import { createAgentEvent } from "@/services/events";
import { toAgentMapping } from "@/services/mappings";
import { broadcastPanelEvent } from "@/server/panel-events";
import { NormalizedProduct, ProductSyncResult } from "@/types/agent";

const DEFAULT_SYNC_TIMEOUT_MS = 120000;
const DEFAULT_SYNC_INTERVAL_SECONDS = 15;

export async function getOrCreateSyncConfig(agentId: string) {
  return prisma.syncConfig.upsert({
    where: { agentId },
    create: { agentId, enabled: true, intervalSeconds: getDefaultSyncIntervalSeconds() },
    update: {}
  });
}

export async function updateSyncConfig(agentId: string, data: { intervalSeconds: number }) {
  return prisma.syncConfig.upsert({
    where: { agentId },
    create: {
      agentId,
      enabled: true,
      intervalSeconds: clampInterval(data.intervalSeconds)
    },
    update: {
      enabled: true,
      intervalSeconds: clampInterval(data.intervalSeconds)
    }
  });
}

export async function runProductSync(agentId: string) {
  const startedAt = Date.now();
  const agent = await getAgent(agentId);

  if (!agent?.database || !agent.mapping) {
    throw new Error("Banco e mapping sao obrigatorios para sincronizar.");
  }

  const mapping = toAgentMapping(agent.mapping);
  if (!mapping.idField) {
    throw new Error("Campo ID do produto e obrigatorio para sincronizar.");
  }

  await createAgentEvent({
    agentId,
    type: "sync:started",
    message: "Sync de produtos iniciado."
  }).catch(() => undefined);
  broadcastPanelEvent({ type: "sync:started", agentId });

  const result = await syncProducts(agentId, {
    db: toDbConfig(agent.database),
    mapping
  }, getSyncTimeoutMs()) as ProductSyncResult;

  const applied = await applySyncResult(agentId, result);
  const durationMs = Date.now() - startedAt;
  await prisma.syncConfig.upsert({
    where: { agentId },
    create: buildSyncConfigData(agentId, "success", "Sync finalizado.", applied, durationMs),
    update: buildSyncConfigUpdate("success", "Sync finalizado.", applied, durationMs)
  });
  await createAgentEvent({
    agentId,
    type: "sync:finished",
    level: "success",
    message: `Sync finalizado: ${applied.created.length} novos, ${applied.updated.length} atualizados, ${applied.removed.length} removidos.`,
    metadata: {
      totalRows: applied.totalRows,
      created: applied.created.length,
      updated: applied.updated.length,
      removed: applied.removed.length,
      unchanged: applied.unchanged,
      durationMs
    }
  }).catch(() => undefined);
  broadcastPanelEvent({ type: "sync:finished", agentId, payload: applied });
  if (applied.created.length || applied.updated.length || applied.removed.length) {
    broadcastPanelEvent({ type: "products:changed", agentId });
  }

  return applied;
}

export async function markSyncFailed(agentId: string, message: string) {
  const result = await prisma.syncConfig.upsert({
    where: { agentId },
    create: {
      agentId,
      enabled: true,
      intervalSeconds: getDefaultSyncIntervalSeconds(),
      lastSyncAt: new Date(),
      lastStatus: "error",
      lastMessage: limitText(message),
      consecutiveFailures: 1
    },
    update: {
      lastSyncAt: new Date(),
      lastStatus: "error",
      lastMessage: limitText(message),
      consecutiveFailures: { increment: 1 }
    }
  });
  await createAgentEvent({
    agentId,
    type: "sync:error",
    level: "error",
    message: limitText(message)
  }).catch(() => undefined);
  broadcastPanelEvent({ type: "sync:error", agentId, payload: { message: limitText(message) } });
  return result;
}

export async function listDueSyncConfigs(now = new Date()) {
  const agents = await prisma.agent.findMany({
    where: { status: "online" },
    include: {
      database: true,
      mapping: true,
      syncConfig: true
    }
  });

  return agents.flatMap((agent) => {
    if (!agent.database || !agent.mapping) {
      return [];
    }
    const intervalSeconds = clampInterval(agent.syncConfig?.intervalSeconds ?? getDefaultSyncIntervalSeconds());
    if (!agent.syncConfig?.lastSyncAt) {
      return [{ agentId: agent.id }];
    }
    return now.getTime() - agent.syncConfig.lastSyncAt.getTime() >= intervalSeconds * 1000
      ? [{ agentId: agent.id }]
      : [];
  });
}

export function getDefaultSyncIntervalSeconds(): number {
  const value = Number(process.env.PHARMA_SYNC_INTERVAL_SECONDS ?? DEFAULT_SYNC_INTERVAL_SECONDS);
  if (!Number.isFinite(value)) {
    return DEFAULT_SYNC_INTERVAL_SECONDS;
  }
  return clampInterval(value);
}

async function applySyncResult(agentId: string, result: ProductSyncResult): Promise<ProductSyncResult> {
  const now = new Date();
  const products = dedupeProducts(result.products ?? [...result.created, ...result.updated]);
  if (!result.products) {
    for (const product of products) {
      await upsertSyncedProduct(agentId, product, now);
    }
    for (const externalId of result.removed) {
      await markProductRemoved(agentId, externalId, now);
    }
    return result;
  }

  const existing = await prisma.importedProduct.findMany({
    where: {
      agentId,
      importJobId: null,
      externalId: { not: null }
    }
  });
  const existingByExternalId = new Map(existing.map((product) => [String(product.externalId), product]));
  const nextExternalIds = new Set(products.map((product) => String(product.externalId)));
  const created: NormalizedProduct[] = [];
  const updated: NormalizedProduct[] = [];
  const removed: string[] = [];
  let unchanged = 0;

  await prisma.$transaction(async (tx) => {
    for (const product of products) {
      const externalId = String(product.externalId);
      const previous = existingByExternalId.get(externalId);
      const changed = !previous || hasProductChanged(previous, product);

      if (!previous) {
        created.push(product);
      } else if (changed) {
        updated.push(product);
      } else {
        unchanged += 1;
      }

      if (!previous || changed || previous.active === false) {
        await tx.importedProduct.upsert({
          where: {
            agentId_externalId: {
              agentId,
              externalId
            }
          },
          create: buildProductData(agentId, product, now),
          update: {
            active: true,
            lastSeenAt: now,
            name: product.name,
            price: product.price ?? null,
            stock: product.stock ?? null,
            image: product.image ?? null,
            rawJson: JSON.stringify(product)
          }
        });
      }
    }

    for (const previous of existing) {
      const externalId = String(previous.externalId);
      if (previous.active && !nextExternalIds.has(externalId)) {
        removed.push(externalId);
        await tx.importedProduct.update({
          where: { id: previous.id },
          data: {
            active: false,
            lastSeenAt: now
          }
        });
      }
    }
  });

  const logs = [
    ...(result.logs ?? []),
    `Panel diff: total=${products.length} created=${created.length} updated=${updated.length} removed=${removed.length} unchanged=${unchanged}`
  ];

  return {
    totalRows: products.length,
    products,
    created,
    updated,
    removed,
    unchanged,
    logs
  };
}

function dedupeProducts(products: NormalizedProduct[]) {
  const byExternalId = new Map<string, NormalizedProduct>();
  for (const product of products) {
    if (!product.externalId || !product.name) {
      continue;
    }
    byExternalId.set(String(product.externalId), product);
  }
  return [...byExternalId.values()];
}

async function upsertSyncedProduct(agentId: string, product: NormalizedProduct, now: Date) {
  const externalId = String(product.externalId);
  await prisma.importedProduct.upsert({
    where: {
      agentId_externalId: {
        agentId,
        externalId
      }
    },
    create: buildProductData(agentId, product, now),
    update: {
      active: true,
      lastSeenAt: now,
      name: product.name,
      price: product.price ?? null,
      stock: product.stock ?? null,
      image: product.image ?? null,
      rawJson: JSON.stringify(product)
    }
  });
}

async function markProductRemoved(agentId: string, externalId: string, now: Date) {
  await prisma.importedProduct.updateMany({
    where: { agentId, externalId },
    data: {
      active: false,
      lastSeenAt: now
    }
  });
}

function buildProductData(agentId: string, product: NormalizedProduct, now: Date) {
  return {
    agentId,
    externalId: String(product.externalId),
    active: true,
    lastSeenAt: now,
    name: product.name,
    price: product.price ?? null,
    stock: product.stock ?? null,
    image: product.image ?? null,
    rawJson: JSON.stringify(product)
  };
}

function hasProductChanged(
  previous: { name: string; price: number | null; stock: number | null; image: string | null; active: boolean },
  product: NormalizedProduct
) {
  return previous.active === false
    || previous.name !== product.name
    || previous.price !== (product.price ?? null)
    || previous.stock !== (product.stock ?? null)
    || previous.image !== (product.image ?? null);
}

function buildSyncConfigData(agentId: string, status: string, message: string, result: ProductSyncResult, durationMs: number) {
  return {
    agentId,
    enabled: true,
    intervalSeconds: getDefaultSyncIntervalSeconds(),
    ...buildSyncConfigUpdate(status, message, result, durationMs)
  };
}

function buildSyncConfigUpdate(status: string, message: string, result: ProductSyncResult, durationMs: number) {
  return {
    lastSyncAt: new Date(),
    lastStatus: status,
    lastMessage: limitText(message),
    lastTotalRows: result.totalRows,
    lastCreated: result.created.length,
    lastUpdated: result.updated.length,
    lastRemoved: result.removed.length,
    lastUnchanged: result.unchanged,
    lastDurationMs: durationMs,
    consecutiveFailures: 0,
    lastLogs: limitText(result.logs.join("\n"), 4000)
  };
}

function clampInterval(value: number): number {
  if (!Number.isFinite(value)) {
    return getDefaultSyncIntervalSeconds();
  }
  return Math.min(3600, Math.max(10, Math.trunc(value)));
}

function getSyncTimeoutMs() {
  const value = Number(process.env.PHARMA_SYNC_COMMAND_TIMEOUT_MS ?? DEFAULT_SYNC_TIMEOUT_MS);
  if (!Number.isFinite(value)) {
    return DEFAULT_SYNC_TIMEOUT_MS;
  }
  return Math.min(600000, Math.max(10000, Math.trunc(value)));
}

function limitText(value: string, maxLength = 500) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
