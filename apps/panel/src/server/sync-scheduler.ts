import { isAgentOnline } from "@/server/agent-registry";
import { listDueSyncConfigs, markSyncFailed, runProductSync } from "@/services/sync";

const SYNC_TICK_MS = 5000;
const DEFAULT_RETRY_COUNT = 1;

const globalForSyncScheduler = globalThis as unknown as {
  pharmaSyncSchedulerStarted?: boolean;
  pharmaSyncRunningAgents?: Set<string>;
};

export function setupSyncScheduler() {
  if (globalForSyncScheduler.pharmaSyncSchedulerStarted) {
    return;
  }

  globalForSyncScheduler.pharmaSyncSchedulerStarted = true;
  globalForSyncScheduler.pharmaSyncRunningAgents = globalForSyncScheduler.pharmaSyncRunningAgents ?? new Set();

  setInterval(() => {
    runDueSyncs().catch((error) => {
      console.error("Erro no scheduler de sync:", error);
    });
  }, SYNC_TICK_MS);
}

async function runDueSyncs() {
  const runningAgents = globalForSyncScheduler.pharmaSyncRunningAgents ?? new Set<string>();
  const configs = await listDueSyncConfigs();

  for (const config of configs) {
    if (runningAgents.has(config.agentId) || !isAgentOnline(config.agentId)) {
      continue;
    }

    runningAgents.add(config.agentId);
    runProductSyncWithRetry(config.agentId)
      .catch((error) => markSyncFailed(config.agentId, error instanceof Error ? error.message : "Falha no sync automatico."))
      .finally(() => runningAgents.delete(config.agentId));
  }
}

async function runProductSyncWithRetry(agentId: string) {
  const retries = getRetryCount();
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await runProductSync(agentId);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await delay(1000 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

function getRetryCount() {
  const value = Number(process.env.PHARMA_SYNC_RETRY_COUNT ?? DEFAULT_RETRY_COUNT);
  if (!Number.isFinite(value)) {
    return DEFAULT_RETRY_COUNT;
  }
  return Math.min(5, Math.max(0, Math.trunc(value)));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
