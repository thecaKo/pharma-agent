import crypto from "node:crypto";
import { prisma } from "@/db/prisma";

export async function createToken() {
  return prisma.agentToken.create({
    data: {
      token: crypto.randomBytes(24).toString("hex"),
      status: "pending"
    }
  });
}

export async function listTokens() {
  return prisma.agentToken.findMany({
    include: { agent: true },
    orderBy: { createdAt: "desc" }
  });
}
