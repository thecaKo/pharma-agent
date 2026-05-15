import { io, type Socket } from "socket.io-client";
import { emitAgentEvent, postHeartbeat } from "../api/event-sink";
import { postCommandResult, neoCommandNameFromEvent } from "../api/command-result";
import { pushProductSnapshotDelta } from "../sync/product-sync-delta";
import { wireToAgentCommand, type WireCommand } from "../api/neo-command-mapper";
import { getCachedImportConfig, refreshImportConfigFromApi } from "../api/remote-sync-config";
import { getPrimaryServiceBaseUrl } from "../config/api-url";
import { handleCommand } from "../commands";
import { AgentCommandResponse, LocalConfig, ProductSyncResult } from "../types";

let socket: Socket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;

const NEO_COMMANDS = [
  "searchDatabases",
  "testDatabase",
  "loadSchema",
  "loadColumns",
  "syncNow",
  "refreshConfig"
] as const;

function clearHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat(config: LocalConfig): void {
  clearHeartbeat();
  void postHeartbeat(config);
  heartbeatTimer = setInterval(() => {
    void postHeartbeat(config);
  }, 30_000);
}

export function startCommandPolling(_config: LocalConfig): void {
  if (process.env.PHARMA_AGENT_POLL_COMMANDS === "true") {
    console.warn("PHARMA_AGENT_POLL_COMMANDS nao implementado para NEO-API; use Socket.IO.");
  }
}

export function connectToPanel(config: LocalConfig): void {
  if (socket?.connected) {
    return;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }

  let root: string;
  try {
    root = getPrimaryServiceBaseUrl(config).replace(/\/+$/, "");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    scheduleReconnect(config);
    return;
  }

  const path = process.env.PHARMA_AGENT_SOCKET_PATH?.trim() || "/socket.io";
  const url = `${root}/pharma-connector`;

  socket = io(url, {
    path,
    auth: { token: config.token },
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    console.log(`Socket.io conectado: ${url}`);
    void emitAgentEvent(config, "agent.connected", {});
    startHeartbeat(config);
    void refreshImportConfigFromApi(config);
    registerNeoCommandHandlers(config, socket!);
  });

  socket.on("disconnect", () => {
    console.log("Socket.io desconectado.");
    void emitAgentEvent(config, "agent.disconnected", {});
    clearHeartbeat();
    scheduleReconnect(config);
  });

  socket.on("connect_error", (error) => {
    console.error(`Socket.io erro: ${error.message}`);
  });
}

function registerNeoCommandHandlers(config: LocalConfig, s: Socket): void {
  for (const name of NEO_COMMANDS) {
    const ev = `command.${name}`;
    s.off(ev);
    s.on(ev, (payload: unknown) => {
      void handleNeoSocketCommand(config, ev, payload);
    });
  }
}

async function handleNeoSocketCommand(
  config: LocalConfig,
  eventName: string,
  payload: unknown
): Promise<void> {
  const cmd = neoCommandNameFromEvent(eventName);
  if (!cmd) {
    return;
  }
  const envelope = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const commandPayload =
    envelope.payload && typeof envelope.payload === "object" ? envelope.payload : envelope;
  const id =
    typeof envelope.commandId === "string"
      ? envelope.commandId
      : typeof (commandPayload as Record<string, unknown>).commandId === "string"
        ? ((commandPayload as Record<string, unknown>).commandId as string)
        : `neo-${cmd}-${Date.now()}`;
  const wire: WireCommand = { id, type: eventName, payload: commandPayload ?? {} };
  if (cmd === "syncNow") {
    await emitAgentEvent(config, "sync.started", { commandId: id });
  }
  const response = await dispatchWireCommand(wire, config);
  if (response.success && cmd === "syncNow" && response.data && typeof response.data === "object") {
    const data = response.data as ProductSyncResult;
    if (data.products?.length) {
      await pushProductSnapshotDelta(config, data.products);
    }
  }
  await postCommandResult(config, cmd, response);
}

async function dispatchWireCommand(wire: WireCommand, config: LocalConfig): Promise<AgentCommandResponse> {
  console.log(`Comando recebido: ${wire.type} (${wire.id})`);

  if (wire.type === "command.refreshConfig") {
    await refreshImportConfigFromApi(config);
    return { commandId: wire.id, success: true, data: { refreshed: true } };
  }

  if (wire.type === "command.syncNow") {
    await refreshImportConfigFromApi(config);
    if (!getCachedImportConfig()) {
      return { commandId: wire.id, success: false, error: "Sem configuracao de sync (config/mapping incompleto na API)." };
    }
  }

  const mapped = wireToAgentCommand(wire, getCachedImportConfig);
  if (!mapped) {
    return { commandId: wire.id, success: false, error: `Comando nao suportado: ${wire.type}` };
  }

  return handleCommand(mapped);
}

function scheduleReconnect(config: LocalConfig): void {
  if (reconnectTimer) {
    return;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToPanel(config);
  }, 5000);
}
