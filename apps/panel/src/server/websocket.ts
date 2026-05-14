import http from "node:http";
import { parse } from "node:url";
import WebSocket, { WebSocketServer } from "ws";
import { prisma } from "@/db/prisma";
import { markAgentOffline, markAgentOnline } from "@/services/agents";
import { createAgentEvent } from "@/services/events";
import { AgentCommandResponse } from "@/types/agent";
import { removeAgentSocket, resolveCommandResponse, setAgentSocket } from "./agent-registry";
import { addPanelSocket, broadcastPanelEvent } from "./panel-events";

type AgentSocketMessage =
  | { type: "agent:hello"; payload?: { agentId?: string; agentName?: string } }
  | { type: "command:response"; payload?: AgentCommandResponse };

export function setupAgentWebsocketServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    const parsed = parse(request.url ?? "", true);

    if (parsed.pathname === "/api/panel/socket") {
      wss.handleUpgrade(request, socket, head, (websocket) => {
        wss.emit("panel:connection", websocket, request);
      });
      return;
    }

    if (parsed.pathname !== "/api/agents/socket") {
      return;
    }

    const agentId = readQueryValue(parsed.query.agentId);
    const token = readQueryValue(parsed.query.token);

    if (!agentId || !token || !(await isValidAgent(agentId, token))) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit("connection", websocket, request, agentId);
    });
  });

  wss.on("panel:connection", (socket: WebSocket) => {
    addPanelSocket(socket);
    socket.send(JSON.stringify({ type: "panel:ready", createdAt: new Date().toISOString() }));
  });

  wss.on("connection", async (socket: WebSocket, _request: http.IncomingMessage, agentId: string) => {
    setAgentSocket(agentId, socket);
    await markAgentOnline(agentId);
    await createAgentEvent({
      agentId,
      type: "agent:online",
      level: "success",
      message: "Agente conectado ao painel."
    }).catch(() => undefined);
    broadcastPanelEvent({ type: "agent:online", agentId });

    socket.on("message", (raw) => {
      const message = parseMessage(raw.toString());
      if (!message) {
        return;
      }

      if (message.type === "command:response" && message.payload) {
        resolveCommandResponse(message.payload);
        broadcastPanelEvent({
          type: message.payload.success ? "command:success" : "command:error",
          agentId,
          payload: message.payload
        });
      }
    });

    socket.on("close", async () => {
      removeAgentSocket(agentId, socket);
      await markAgentOffline(agentId).catch(() => undefined);
      await createAgentEvent({
        agentId,
        type: "agent:offline",
        level: "warning",
        message: "Agente desconectado do painel."
      }).catch(() => undefined);
      broadcastPanelEvent({ type: "agent:offline", agentId });
    });

    socket.on("error", () => {
      removeAgentSocket(agentId, socket);
    });
  });
}

async function isValidAgent(agentId: string, token: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { token: true }
  });

  return Boolean(agent && agent.token.token === token);
}

function readQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function parseMessage(raw: string): AgentSocketMessage | null {
  try {
    const message = JSON.parse(raw) as AgentSocketMessage;
    if (message && typeof message === "object" && typeof message.type === "string") {
      return message;
    }
    return null;
  } catch {
    return null;
  }
}
