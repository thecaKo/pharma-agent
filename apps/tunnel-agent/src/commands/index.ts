import { AgentCommand, AgentCommandResponse } from "../types";
import { runColumns } from "./columns";
import {
  runDatabaseAutoDetect,
  runDatabaseDeepScan,
  runDatabaseFileValidation,
  runDatabaseFiles,
  runFirebirdAutoDetect,
  runFirebirdDeepScan,
  runFirebirdFileValidation,
  runFirebirdFiles
} from "./firebird-files";
import { runImportProducts } from "./import-products";
import { runSchema } from "./schema";
import { runSyncProducts } from "./sync-products";
import { runTestConnection } from "./test-connection";

export async function handleCommand(command: AgentCommand): Promise<AgentCommandResponse> {
  try {
    switch (command.type) {
      case "db:test":
        return success(command.id, await runTestConnection(command.payload));
      case "db:schema":
        return success(command.id, await runSchema(command.payload));
      case "db:columns":
        return success(command.id, await runColumns(command.payload));
      case "database:auto-detect":
        return success(command.id, await runDatabaseAutoDetect(command.payload));
      case "database:deep-scan":
        return success(command.id, await runDatabaseDeepScan(command.payload));
      case "database:files":
        return success(command.id, await runDatabaseFiles(command.payload));
      case "database:validate-file":
        return success(command.id, await runDatabaseFileValidation(command.payload));
      case "firebird:auto-detect":
        return success(command.id, await runFirebirdAutoDetect(command.payload));
      case "firebird:deep-scan":
        return success(command.id, await runFirebirdDeepScan(command.payload));
      case "firebird:files":
        return success(command.id, await runFirebirdFiles(command.payload));
      case "firebird:validate-file":
        return success(command.id, await runFirebirdFileValidation(command.payload));
      case "products:import":
        return success(command.id, await runImportProducts(command.payload));
      case "products:sync":
        return success(command.id, await runSyncProducts(command.payload));
    }
  } catch (error) {
    return failure(command.id, error instanceof Error ? error.message : "Erro desconhecido");
  }
}

function success<T>(commandId: string, data: T): AgentCommandResponse<T> {
  return {
    commandId,
    success: true,
    data
  };
}

function failure(commandId: string, error: string): AgentCommandResponse {
  return {
    commandId,
    success: false,
    error
  };
}
