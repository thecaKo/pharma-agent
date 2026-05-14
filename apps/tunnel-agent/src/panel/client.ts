import WebSocket from "ws";
import { handleCommand } from "../commands";
import { getPanelUrl } from "../config/panel-url";
import { AgentCommand, AgentCommandResponse, LocalConfig } from "../types";

let socket: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

export function connectToPanel(config: LocalConfig & { agentId: string }): void {
  if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
    return;
  }

  const websocketUrl = resolveWebsocketUrl(config);
  socket = new WebSocket(websocketUrl, {
    headers: {
      "x-agent-id": config.agentId,
      "x-agent-token": config.token
    }
  });

  socket.on("open", () => {
    console.log(`Conectado ao painel via WebSocket: ${websocketUrl}`);
    send({
      type: "agent:hello",
      payload: {
        agentId: config.agentId,
        agentName: config.agentName
      }
    });
  });

  socket.on("message", async (raw) => {
    const command = parseCommand(raw.toString());
    if (!command) {
      return;
    }

    console.log(`Comando recebido: ${command.type} (${command.id})`);
    const response = await handleCommand(command);
    sendCommandResponse(response);
  });

  socket.on("close", () => {
    console.log("WebSocket do painel desconectado.");
    scheduleReconnect(config);
  });

  socket.on("error", (error) => {
    console.error(`Erro no WebSocket do painel: ${error.message}`);
  });
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

function parseCommand(raw: string): AgentCommand | null {
  try {
    const message = JSON.parse(raw) as unknown;
    if (isAgentCommand(message)) {
      return message;
    }
    if (isCommandEnvelope(message)) {
      return message.payload;
    }
    console.warn(`Mensagem WebSocket ignorada: ${raw}`);
    return null;
  } catch (error) {
    console.warn(`Mensagem WebSocket invalida: ${raw}`);
    return null;
  }
}

function isCommandEnvelope(value: unknown): value is { type: "command"; payload: AgentCommand } {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { type?: unknown }).type === "command" &&
      isAgentCommand((value as { payload?: unknown }).payload)
  );
}

function isAgentCommand(value: unknown): value is AgentCommand {
  if (!value || typeof value !== "object") {
    return false;
  }
  const maybeCommand = value as { id?: unknown; type?: unknown; payload?: unknown };
  return (
    typeof maybeCommand.id === "string" &&
    typeof maybeCommand.type === "string" &&
    maybeCommand.payload !== undefined &&
    [
      "db:test",
      "db:schema",
      "db:columns",
      "database:auto-detect",
      "database:deep-scan",
      "database:files",
      "database:validate-file",
      "firebird:auto-detect",
      "firebird:deep-scan",
      "firebird:files",
      "firebird:validate-file",
      "products:import",
      "products:sync"
    ].includes(maybeCommand.type)
  );
}

function resolveWebsocketUrl(config: LocalConfig): string {
  if (config.websocketUrl) {
    return addAuthQuery(config.websocketUrl, config);
  }

  const panelUrl = new URL(getPanelUrl());
  panelUrl.protocol = panelUrl.protocol === "https:" ? "wss:" : "ws:";
  panelUrl.pathname = "/api/agents/socket";
  return addAuthQuery(panelUrl.toString(), config);
}

function addAuthQuery(value: string, config: LocalConfig): string {
  const url = new URL(value, getPanelUrl());
  if (config.agentId) {
    url.searchParams.set("agentId", config.agentId);
  }
  url.searchParams.set("token", config.token);
  return url.toString();
}
