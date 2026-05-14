import { prisma } from "@/db/prisma";
import { DbConfig, DbDriver } from "@/types/agent";

export async function saveDatabaseConfig(agentId: string, config: DbConfig) {
  return prisma.databaseConfig.upsert({
    where: { agentId },
    create: {
      agentId,
      ...config
    },
    update: {
      ...config
    }
  });
}

export async function updateDatabaseTestResult(agentId: string, status: string, message: string) {
  return prisma.databaseConfig.update({
    where: { agentId },
    data: {
      lastTestStatus: status,
      lastTestMessage: message
    }
  });
}

export function toDbConfig(config: {
  driver: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}): DbConfig {
  if (!["mysql", "firebird"].includes(config.driver)) {
    throw new Error(`Driver invalido salvo no banco: ${config.driver}`);
  }

  return {
    driver: config.driver as DbDriver,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password
  };
}
