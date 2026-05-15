import fs from "node:fs";
import { emitAgentEvent } from "./api/event-sink";
import { pushProductSnapshotDelta } from "./sync/product-sync-delta";
import { getCachedImportConfig, refreshImportConfigFromApi } from "./api/remote-sync-config";
import { handleCommand } from "./commands";
import { applyEnvToConfig } from "./config/env-merge";
import { loadRuntimeEnv } from "./config/env-file";
import { isRegistered, loadConfig } from "./config/local-config";
import { connectToPanel, startCommandPolling } from "./panel/client";
import { startSetupServer } from "./setup/server";

process.on("uncaughtException", (error) => {
  console.error("Erro nao tratado no agente:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Promise rejeitada sem tratamento no agente:", error);
});

async function main(): Promise<void> {
  await loadRuntimeEnv();
  configureFirebirdLock();

  const raw = await loadConfig();
  const config = applyEnvToConfig(raw);
  const setupPort = Number(process.env.PHARMA_AGENT_SETUP_PORT ?? 3333);
  const setupHost = process.env.PHARMA_AGENT_SETUP_HOST ?? "127.0.0.1";

  startSetupServer({ port: setupPort, host: setupHost });

  if (isRegistered(config)) {
    await emitAgentEvent(config, "agent.started", {});
    void refreshImportConfigFromApi(config);
    connectToPanel(config);
    startCommandPolling(config);

    const intervalMs = (config.syncIntervalSeconds ?? 15) * 1000;
    setInterval(() => {
      void runScheduledSync(config);
    }, intervalMs);
    return;
  }

  console.log("Agente sem token/API. Configure PHARMA_API_URL e PHARMA_AGENT_TOKEN.");
}

async function runScheduledSync(config: Parameters<typeof emitAgentEvent>[0]): Promise<void> {
  await refreshImportConfigFromApi(config);
  const ic = getCachedImportConfig();
  if (!ic) {
    return;
  }
  const id = `auto-sync-${Date.now()}`;
  try {
    await emitAgentEvent(config, "sync.started", { commandId: id });
    const r = await handleCommand({ id, type: "products:sync", payload: ic });
    if (r.success && r.data && typeof r.data === "object" && "products" in r.data) {
      const products = (r.data as { products?: import("./types").NormalizedProduct[] }).products;
      if (products?.length) {
        await pushProductSnapshotDelta(config, products);
      }
    }
    await emitAgentEvent(config, r.success ? "sync.finished" : "sync.failed", {
      commandId: id,
      error: r.error
    });
  } catch (error) {
    await emitAgentEvent(config, "sync.failed", {
      commandId: id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function configureFirebirdLock(): void {
  if (process.env.FIREBIRD_LOCK || process.platform === "win32") {
    return;
  }

  const lockDir = "/tmp/pharma-firebird-lock";
  fs.mkdirSync(lockDir, { recursive: true });
  process.env.FIREBIRD_LOCK = lockDir;
}
