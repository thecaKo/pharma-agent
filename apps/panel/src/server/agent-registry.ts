import WebSocket from "ws";
import { AgentCommand, AgentCommandResponse } from "@/types/agent";

type PendingCommand = {
  resolve: (response: AgentCommandResponse) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type RegistryState = {
  sockets: Map<string, WebSocket>;
  pendingCommands: Map<string, PendingCommand>;
};

const globalForRegistry = globalThis as unknown as {
  pharmaAgentRegistry?: RegistryState;
};

const registry =
  globalForRegistry.pharmaAgentRegistry ??
  {
    sockets: new Map<string, WebSocket>(),
    pendingCommands: new Map<string, PendingCommand>()
  };

globalForRegistry.pharmaAgentRegistry = registry;

export function setAgentSocket(agentId: string, socket: WebSocket) {
  registry.sockets.set(agentId, socket);
  console.log(`Agente conectado no registry: ${agentId}`);
}

export function removeAgentSocket(agentId: string, socket: WebSocket) {
  if (registry.sockets.get(agentId) === socket) {
    registry.sockets.delete(agentId);
    console.log(`Agente removido do registry: ${agentId}`);
  }
}

export function isAgentOnline(agentId: string) {
  return registry.sockets.get(agentId)?.readyState === WebSocket.OPEN;
}

export function resolveCommandResponse(response: AgentCommandResponse) {
  const pending = registry.pendingCommands.get(response.commandId);
  if (!pending) {
    return false;
  }

  clearTimeout(pending.timer);
  registry.pendingCommands.delete(response.commandId);
  pending.resolve(response);
  return true;
}

export function sendCommand(agentId: string, command: AgentCommand, timeoutMs = 30000) {
  const socket = registry.sockets.get(agentId);
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    throw new Error("Agente offline.");
  }

  const promise = new Promise<AgentCommandResponse>((resolve, reject) => {
    const timer = setTimeout(() => {
      registry.pendingCommands.delete(command.id);
      reject(new Error("Timeout aguardando resposta do agente."));
    }, timeoutMs);

    registry.pendingCommands.set(command.id, { resolve, reject, timer });
  });

  socket.send(JSON.stringify({ type: "command", payload: command }));
  return promise;
}
