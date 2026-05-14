import { prisma } from "@/db/prisma";
import { broadcastPanelEvent } from "@/server/panel-events";

type EventInput = {
  agentId: string;
  type: string;
  level?: "info" | "success" | "warning" | "error";
  message: string;
  metadata?: unknown;
};

export async function createAgentEvent(input: EventInput) {
  const event = await prisma.agentEvent.create({
    data: {
      agentId: input.agentId,
      type: input.type,
      level: input.level ?? "info",
      message: input.message,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null
    }
  });

  broadcastPanelEvent({
    type: "agent:event",
    agentId: input.agentId,
    payload: event
  });

  return event;
}

export async function listAgentEvents(agentId: string, take = 100) {
  return prisma.agentEvent.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    take
  });
}

export async function listEvents(take = 200) {
  return prisma.agentEvent.findMany({
    include: { agent: true },
    orderBy: { createdAt: "desc" },
    take
  });
}
