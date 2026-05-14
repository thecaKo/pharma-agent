import fs from "node:fs";
import { isRegistered, loadConfig } from "./config/local-config";
import { connectToPanel } from "./panel/client";
import { startSetupServer } from "./setup/server";

configureFirebirdLock();

process.on("uncaughtException", (error) => {
  console.error("Erro nao tratado no agente:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Promise rejeitada sem tratamento no agente:", error);
});

const SETUP_PORT = Number(process.env.PHARMA_AGENT_SETUP_PORT ?? 3333);
const SETUP_HOST = process.env.PHARMA_AGENT_SETUP_HOST ?? "127.0.0.1";

async function main(): Promise<void> {
  const config = await loadConfig();

  startSetupServer({ port: SETUP_PORT, host: SETUP_HOST });

  if (isRegistered(config)) {
    connectToPanel(config);
    return;
  }

  console.log("Agente ainda nao registrado. Abra o setup local para configurar token e painel.");
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
