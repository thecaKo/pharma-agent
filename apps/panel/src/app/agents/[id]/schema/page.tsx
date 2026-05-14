import Link from "next/link";
import { AgentTabs } from "@/components/agent-tabs";
import { getAgent } from "@/services/agents";
import { fetchSchema } from "@/services/commands";
import { toDbConfig } from "@/services/database-configs";

type Props = {
  params: { id: string };
  searchParams: { fetch?: string };
};

type SchemaResult = {
  tables?: string[];
  candidates?: string[];
  error?: string;
};

export default async function SchemaPage({ params, searchParams }: Props) {
  const agent = await getAgent(params.id);
  if (!agent) {
    return <p>Agente nao encontrado.</p>;
  }

  let result: SchemaResult | null = null;
  if (searchParams.fetch && agent.database) {
    try {
      result = await fetchSchema(agent.id, toDbConfig(agent.database)) as SchemaResult;
    } catch (error) {
      result = { error: error instanceof Error ? error.message : "Falha ao buscar tabelas." };
    }
  }

  const candidates = result?.candidates ?? [];
  const others = (result?.tables ?? []).filter((table) => !candidates.includes(table));

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Schema</h1>
          <p>{agent.name}</p>
        </div>
        <Link className="button secondary" href={`/agents/${agent.id}/database`}>Banco</Link>
      </header>

      <AgentTabs agentId={agent.id} current="schema" />

      <section className="panel">
        <div className="panel-body">
          {agent.database ? (
            <form method="get" className="actions" style={{ marginTop: 0 }}>
              <input type="hidden" name="fetch" value="1" />
              <button type="submit">Buscar tabelas</button>
            </form>
          ) : (
            <p className="muted">Configure o banco antes de buscar tabelas.</p>
          )}
          {result?.error ? <p style={{ color: "var(--danger)" }}>{result.error}</p> : null}
        </div>
      </section>

      {result ? (
        <section className="panel">
          <table>
            <thead>
              <tr>
                <th>Tabela</th>
                <th>Tipo</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {[...candidates, ...others].map((table) => (
                <tr key={table}>
                  <td>{table}</td>
                  <td>{candidates.includes(table) ? "Candidata" : "Tabela"}</td>
                  <td><Link className="button secondary" href={`/agents/${agent.id}/mapping?table=${encodeURIComponent(table)}&load=1`}>Mapear</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
