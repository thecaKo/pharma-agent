import WebSocket from "ws";
import { emitAgentEvent, postHeartbeat } from "../api/event-sink";
import { extractWireCommand, wireToAgentCommand, type WireCommand } from "../api/neo-command-mapper";
import { getCachedImportConfig, refreshImportConfigFromApi } from "../api/remote-sync-config";
import { handleCommand } from "../commands";
import { getPrimaryServiceBaseUrl, resolveServiceUrl } from "../config/api-url";
import { AgentCommandResponse, LocalConfig } from "../types";

let socket: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let pollTimer: NodeJS.Timeout | null = null;
let commandPollCursor = "";

function clearHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function clearPoll(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startHeartbeat(config: LocalConfig & { agentId: string }): void {
  clearHeartbeat();
  heartbeatTimer = setInterval(() => {
    void postHeartbeat(config);
  }, 30_000);
}

function startPoll(config: LocalConfig & { agentId: string }): void {
  clearPoll();
  pollTimer = setInterval(() => {
    void pollRemoteCommands(config);
  }, 15_000);
}

export function startCommandPolling(config: LocalConfig & { agentId: string }): void {
  startPoll(config);
}

async function pollRemoteCommands(config: LocalConfig & { agentId: string }): Promise<void> {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
    return;
  }
  const pathTemplate = process.env.PHARMA_AGENT_COMMAND_POLL_PATH?.trim() || "/v1/agents/me/commands";
  const path = commandPollCursor
    ? `${pathTemplate}?since=${encodeURIComponent(commandPollCursor)}`
    : pathTemplate;
  let url: string;
  try {
    url = resolveServiceUrl(path, config);
  } catch {
    return;
  }
  try {
    const res = await fetch(url, {
      headers: {
        "x-agent-id": config.agentId,
        "x-agent-token": config.token
      }
    });
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as { commands?: unknown[]; cursor?: string } | unknown[];
    const list = Array.isArray(data) ? data : data.commands ?? [];
    if (!Array.isArray(list)) {
      return;
    }
    for (const item of list) {
      const wire = extractWireCommand(item) ?? extractWireCommand({ type: "command", payload: item });
      if (!wire) {
        continue;
      }
      const response = await dispatchWireCommand(wire, config);
      sendCommandResponse(response);
    }
    if (!Array.isArray(data) && typeof data === "object" && data && typeof (data as { cursor?: unknown }).cursor === "string") {
      commandPollCursor = (data as { cursor: string }).cursor;
    }
  } catch {
    /* ignore */
  }
}

export function connectToPanel(config: LocalConfig & { agentId: string }): void {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
    return;
  }

  let websocketUrl: string;
  try {
    websocketUrl = resolveWebsocketUrl(config);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    scheduleReconnect(config);
    startPoll(config);
    return;
  }

  socket = new WebSocket(websocketUrl, {
    headers: {
      "x-agent-id": config.agentId,
      "x-agent-token": config.token
    }
  });

  socket.on("open", () => {
    clearPoll();
    console.log(`Conectado via WebSocket: ${websocketUrl}`);
    void emitAgentEvent(config, "agent.connected", {});
    startHeartbeat(config);
    void refreshImportConfigFromApi(config);
    send({
      type: "agent:hello",
      payload: {
        agentId: config.agentId,
        agentName: config.agentName
      }
    });
  });

  socket.on("message", async (raw) => {
    const wire = parseIncomingToWire(raw.toString());
    if (!wire) {
      return;
    }
    const response = await dispatchWireCommand(wire, config);
    sendCommandResponse(response);
  });

  socket.on("close", () => {
    console.log("WebSocket desconectado.");
    void emitAgentEvent(config, "agent.disconnected", {});
    clearHeartbeat();
    scheduleReconnect(config);
    startPoll(config);
  });

  socket.on("error", (error) => {
    console.error(`Erro no WebSocket: ${error.message}`);
  });
}

function parseIncomingToWire(raw: string): WireCommand | null {
  try {
    const message = JSON.parse(raw) as unknown;
    return extractWireCommand(message);
  } catch {
    console.warn(`Mensagem WebSocket invalida: ${raw}`);
    return null;
  }
}

async function dispatchWireCommand(wire: WireCommand, config: LocalConfig & { agentId: string }): Promise<AgentCommandResponse> {
  console.log(`Comando recebido: ${wire.type} (${wire.id})`);

  if (wire.type === "command.refreshConfig") {
    await refreshImportConfigFromApi(config);
    return { commandId: wire.id, success: true, data: { refreshed: true } };
  }

  if (wire.type === "command.syncNow" && !getCachedImportConfig()) {
    return { commandId: wire.id, success: false, error: "Sem configuracao de sync remota" };
  }

  const mapped = wireToAgentCommand(wire, getCachedImportConfig);
  if (!mapped) {
    return { commandId: wire.id, success: false, error: `Comando nao suportado: ${wire.type}` };
  }

  return handleCommand(mapped);
}

function sendCommandResponse(response: AgentCommandResponse): void {
  send({
    type: "command:response",
    payload: response
  });
}

function send(message: unknown): void {
  if (socket?.readyState !== WebSocket.OPEN) {
    return;
  }
  socket.send(JSON.stringify(message));
}

function scheduleReconnect(config: LocalConfig & { agentId: string }): void {
  if (reconnectTimer) {
    return;
  }

  socket = null;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToPanel(config);
  }, 5000);
}

function resolveWebsocketUrl(config: LocalConfig): string {
  if (config.websocketUrl) {
    return addAuthQuery(config.websocketUrl, config);
  }

  const base = getPrimaryServiceBaseUrl(config);
  if (!base) {
    throw new Error("Defina PHARMA_API_URL ou apiUrl no config (ou PHARMA_PANEL_URL legado).");
  }

  const wsPath = process.env.PHARMA_AGENT_WS_PATH?.trim() || "/api/agents/socket";
  const panelUrl = new URL(base);
  panelUrl.protocol = panelUrl.protocol === "https:" ? "wss:" : "ws:";
  panelUrl.pathname = wsPath.startsWith("/") ? wsPath : `/${wsPath}`;
  return addAuthQuery(panelUrl.toString(), config);
}

function addAuthQuery(value: string, config: LocalConfig): string {
  const base = getPrimaryServiceBaseUrl(config);
  const url = new URL(value, base ? `${base}/` : undefined);
  if (config.agentId) {
    url.searchParams.set("agentId", config.agentId);
  }
  url.searchParams.set("token", config.token);
  return url.toString();
}
