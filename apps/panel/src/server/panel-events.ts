import WebSocket from "ws";

export type PanelEvent = {
  type: string;
  agentId?: string;
  payload?: unknown;
  createdAt: string;
};

const globalForPanelEvents = globalThis as unknown as {
  pharmaPanelSockets?: Set<WebSocket>;
};

const sockets = globalForPanelEvents.pharmaPanelSockets ?? new Set<WebSocket>();
globalForPanelEvents.pharmaPanelSockets = sockets;

export function addPanelSocket(socket: WebSocket) {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", () => sockets.delete(socket));
}

export function broadcastPanelEvent(event: Omit<PanelEvent, "createdAt">) {
  const message = JSON.stringify({
    ...event,
    createdAt: new Date().toISOString()
  } satisfies PanelEvent);

  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}
