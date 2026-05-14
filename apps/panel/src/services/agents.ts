import { prisma } from "@/db/prisma";

export async function listAgents() {
  return prisma.agent.findMany({
    include: {
      database: true,
      mapping: true,
      syncConfig: true,
      _count: {
        select: {
          products: { where: { active: true, importJobId: null } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getAgentSummary(agentId: string) {
  return prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      database: true,
      mapping: true,
      syncConfig: true,
      _count: {
        select: {
          products: { where: { active: true, importJobId: null } },
          events: true,
          imports: true
        }
      }
    }
  });
}

export async function getAgent(agentId: string) {
  return prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      database: true,
      mapping: true,
      syncConfig: true,
      products: {
        where: { importJobId: null },
        orderBy: { updatedAt: "desc" },
        take: 20
      },
      imports: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          products: {
            orderBy: { createdAt: "asc" },
            take: 20
          }
        }
      }
    }
  });
}

export async function listAgentProducts(agentId: string, options?: { status?: string; query?: string; take?: number }) {
  const status = options?.status ?? "active";
  const query = options?.query?.trim();

  return prisma.importedProduct.findMany({
    where: {
      agentId,
      importJobId: null,
      ...(status === "active" ? { active: true } : {}),
      ...(status === "inactive" ? { active: false } : {}),
      ...(query ? { name: { contains: query } } : {})
    },
    orderBy: { updatedAt: "desc" },
    take: options?.take ?? 100
  });
}

export async function listProducts(options?: { agentId?: string; query?: string; take?: number }) {
  const query = options?.query?.trim();

  return prisma.importedProduct.findMany({
    where: {
      importJobId: null,
      active: true,
      ...(options?.agentId ? { agentId: options.agentId } : {}),
      ...(query ? { name: { contains: query } } : {})
    },
    include: {
      agent: true
    },
    orderBy: { updatedAt: "desc" },
    take: options?.take ?? 10
  });
}

export async function registerAgent(tokenValue: string, agentName: string) {
  const token = await prisma.agentToken.findUnique({
    where: { token: tokenValue },
    include: { agent: true }
  });

  if (!token) {
    return { success: false as const, message: "Token invalido." };
  }

  if (token.status !== "pending" || token.agent) {
    return { success: false as const, message: "Token ja utilizado." };
  }

  const agent = await prisma.agent.create({
    data: {
      name: agentName,
      tokenId: token.id,
      status: "offline"
    }
  });

  await prisma.agentToken.update({
    where: { id: token.id },
    data: {
      status: "connected",
      connectedAt: new Date(),
      agentId: agent.id
    }
  });

  return { success: true as const, agent };
}

export async function markAgentOnline(agentId: string) {
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      status: "online",
      lastSeenAt: new Date()
    }
  });
}

export async function markAgentOffline(agentId: string) {
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      status: "offline",
      lastSeenAt: new Date()
    }
  });
}
