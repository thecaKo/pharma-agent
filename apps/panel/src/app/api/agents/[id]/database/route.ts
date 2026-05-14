import { NextResponse } from "next/server";
import { saveDatabaseConfig, updateDatabaseTestResult } from "@/services/database-configs";
import { testDatabase, validateDatabaseFile } from "@/services/commands";
import { DbConfig, DbDriver } from "@/types/agent";

type Params = {
  params: { id: string };
};

export async function POST(request: Request, { params }: Params) {
  const config = readDbConfig(await request.json());

  try {
    if (config.driver === "firebird") {
      await validateDatabaseFile(params.id, config.database);
    }
    await testDatabase(params.id, config);
    await saveDatabaseConfig(params.id, config);
    await updateDatabaseTestResult(params.id, "success", "Conexao testada com sucesso.");
    return NextResponse.json({ success: true, message: "Conexao testada com sucesso." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao testar conexao.";
    if (config.driver !== "firebird") {
      await saveDatabaseConfig(params.id, config);
      await updateDatabaseTestResult(params.id, "error", message);
    }
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

function readDbConfig(body: unknown): DbConfig {
  const value = body as Record<string, unknown>;
  const driver = String(value.driver ?? "") as DbDriver;

  if (!["mysql", "firebird"].includes(driver)) {
    throw new Error("Driver invalido.");
  }

  return {
    driver,
    host: String(value.host ?? "").trim(),
    port: Number(value.port),
    database: String(value.database ?? "").trim(),
    user: String(value.user ?? "").trim(),
    password: String(value.password ?? "")
  };
}
