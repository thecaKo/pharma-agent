import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentTabs } from "@/components/agent-tabs";
import { DatabaseFileResults } from "@/components/database-file-results";
import { Toast } from "@/components/toast";
import { getAgent } from "@/services/agents";
import { deepScanDatabaseFiles, fetchDatabaseFiles, testDatabase, validateDatabaseFile } from "@/services/commands";
import { saveDatabaseConfig, updateDatabaseTestResult } from "@/services/database-configs";
import { DatabaseFile, DbConfig, DbDriver } from "@/types/agent";

type Props = {
  params: { id: string };
  searchParams: {
    status?: string;
    message?: string;
    databaseDir?: string;
    databaseDepth?: string;
    deepScan?: string;
    databaseType?: string;
    selectedDatabase?: string;
  };
};

async function saveAndTest(agentId: string, formData: FormData) {
  "use server";
  const config: DbConfig = {
    driver: String(formData.get("driver") ?? "mysql") as DbDriver,
    host: String(formData.get("host") ?? "").trim(),
    port: Number(formData.get("port") ?? 0),
    database: String(formData.get("database") ?? "").trim(),
    user: String(formData.get("user") ?? "").trim(),
    password: String(formData.get("password") ?? "")
  };

  let status = "success";
  let message = "Conexao testada com sucesso.";

  try {
    if (["firebird", "interbase", "sqlite"].includes(config.driver)) {
      await validateDatabaseFile(agentId, config.database);
    }
    await testDatabase(agentId, config);
    await saveDatabaseConfig(agentId, config);
    await updateDatabaseTestResult(agentId, status, message);
  } catch (error) {
    status = "error";
    message = error instanceof Error ? error.message : "Falha ao testar conexao.";
    if (!["firebird", "interbase", "sqlite"].includes(config.driver)) {
      await saveDatabaseConfig(agentId, config);
      await updateDatabaseTestResult(agentId, status, message);
    }
  }

  redirect(`/agents/${agentId}/database?status=${status}&message=${encodeURIComponent(message)}`);
}

export default async function DatabasePage({ params, searchParams }: Props) {
  const agent = await getAgent(params.id);
  if (!agent) {
    return <p>Agente nao encontrado.</p>;
  }

  const config = agent.database;
  const action = saveAndTest.bind(null, agent.id);
  const databaseDir = (searchParams.databaseDir ?? "").trim();
  const databaseDepth = Number(searchParams.databaseDepth ?? 3);
  let databaseFiles: DatabaseFile[] = [];
  let databaseRoots: string[] = [];
  let databaseFileError: string | null = null;
  const selectedDatabaseType = (searchParams.databaseType ?? "all").trim();

  if (searchParams.deepScan === "1") {
    try {
      const result = await deepScanDatabaseFiles(agent.id) as { roots?: string[]; files?: DatabaseFile[] };
      databaseRoots = result.roots ?? [];
      databaseFiles = result.files ?? [];
    } catch (error) {
      databaseFileError = error instanceof Error ? error.message : "Falha ao executar busca profunda de bancos locais.";
    }
  } else if (databaseDir) {
    try {
      const result = await fetchDatabaseFiles(agent.id, {
        directory: databaseDir,
        maxDepth: databaseDepth,
        maxResults: 100
      }) as { files?: DatabaseFile[] };
      databaseFiles = result.files ?? [];
    } catch (error) {
      databaseFileError = error instanceof Error ? error.message : "Falha ao buscar arquivos de banco.";
    }
  }

  const databaseValue = searchParams.selectedDatabase ?? config?.database ?? "";
  const selectedDriver = getDriverForDatabasePath(searchParams.selectedDatabase) ?? config?.driver ?? "mysql";

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Banco de dados</h1>
          <p>{agent.name}</p>
        </div>
        <Link className="button secondary" href="/agents">Voltar</Link>
      </header>

      <AgentTabs agentId={agent.id} current="database" />

      <Toast status={searchParams.status} message={searchParams.message} />

      <section className="panel">
        <form action={action} className="panel-body">
          <div className="grid">
            <label>
              Driver
              <select name="driver" defaultValue={selectedDriver}>
                <option value="mysql">MySQL</option>
                <option value="firebird">Firebird</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="sqlserver">SQL Server</option>
                <option value="sqlite">SQLite</option>
                <option value="oracle">Oracle</option>
                <option value="interbase">InterBase</option>
              </select>
            </label>
            <label>
              Host
              <input name="host" required defaultValue={config?.host ?? "127.0.0.1"} />
            </label>
            <label>
              Porta
              <input name="port" type="number" required defaultValue={config?.port ?? 3306} />
            </label>
            <label>
              Database
              <input name="database" required defaultValue={databaseValue} />
            </label>
            <label>
              Usuário
              <input name="user" required defaultValue={config?.user ?? ""} />
            </label>
            <label>
              Senha
              <input name="password" type="password" defaultValue={config?.password ?? ""} />
            </label>
          </div>
          <div className="actions">
            <button type="submit">Salvar e testar</button>
            <Link className="button secondary" href={`/agents/${agent.id}/schema`}>Buscar schema</Link>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-body">
          <h2 style={{ fontSize: 16, marginTop: 0 }}>Detectar bancos locais</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            O panel solicita uma busca aprofundada e o agente procura arquivos candidatos de bancos usados em PDV no computador onde está instalado.
          </p>
          <form method="get" className="actions" style={{ marginTop: 0 }}>
            <input type="hidden" name="deepScan" value="1" />
            <button type="submit">Buscar arquivo do banco</button>
          </form>
          {searchParams.deepScan === "1" ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Busca profunda executada com timeout maior. O terminal do agente mostra cada pasta verificada.
            </p>
          ) : null}

          {databaseRoots.length ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Locais verificados: {databaseRoots.join(", ")}
            </p>
          ) : searchParams.deepScan === "1" && !databaseFileError ? (
            <p className="muted" style={{ marginTop: 12 }}>
              O agente não encontrou pastas comuns acessíveis para verificar.
            </p>
          ) : null}

          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Busca manual avançada</summary>
            <form method="get" className="grid" style={{ marginTop: 14 }}>
            <label>
              Pasta no computador do agente
              <input
                name="databaseDir"
                defaultValue={databaseDir}
                placeholder="Ex: C:\\Sistema\\Dados, D:\\, /var/lib ou /opt"
                required
              />
            </label>
            <label>
              Profundidade da busca
              <input name="databaseDepth" type="number" min="0" max="5" defaultValue={Number.isFinite(databaseDepth) ? databaseDepth : 3} />
            </label>
            <div className="actions">
              <button type="submit">Buscar arquivos</button>
            </div>
            </form>
            <p className="muted" style={{ marginTop: 12 }}>
              Use apenas em atendimento técnico. A busca roda no computador do agente e retorna arquivos candidatos de bancos locais.
            </p>
          </details>

          {databaseFileError ? <p style={{ color: "var(--danger)" }}>{databaseFileError}</p> : null}

          {databaseFiles.length ? (
            <DatabaseFileResults
              files={databaseFiles}
              initialDatabaseType={selectedDatabaseType}
            />
          ) : (databaseDir || searchParams.deepScan === "1") && !databaseFileError ? (
            <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>Nenhum arquivo candidato de banco encontrado.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function getDriverForDatabasePath(value: string | undefined): DbDriver | null {
  if (!value) {
    return null;
  }

  const extension = value.toLowerCase().match(/\.[^.\\/]+$/)?.[0];
  if (!extension) {
    return null;
  }

  if ([".fdb", ".fbk", ".gdb"].includes(extension)) {
    return "firebird";
  }

  if ([".ib", ".ibk"].includes(extension)) {
    return "interbase";
  }

  if ([".frm", ".ibd", ".myd", ".myi"].includes(extension)) {
    return "mysql";
  }

  if ([".db", ".sqlite", ".sqlite3"].includes(extension)) {
    return "sqlite";
  }

  if ([".mdf", ".ldf", ".ndf", ".bak"].includes(extension)) {
    return "sqlserver";
  }

  if ([".dump", ".backup"].includes(extension)) {
    return "postgresql";
  }

  if ([".dbf", ".ctl", ".ora"].includes(extension)) {
    return "oracle";
  }

  return null;
}
