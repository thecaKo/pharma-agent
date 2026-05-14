import Link from "next/link";
import { AgentTabs } from "@/components/agent-tabs";
import { getAgentSummary } from "@/services/agents";
import { listAgentEvents } from "@/services/events";

type Props = {
  params: { id: string };
};

export default async function AgentLogsPage({ params }: Props) {
  const agent = await getAgentSummary(params.id);
  if (!agent) {
    return <p>Agente nao encontrado.</p>;
  }

  const events = await listAgentEvents(agent.id, 200);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Logs</h1>
          <p>{agent.name}</p>
        </div>
        <Link className="button secondary" href={`/agents/${agent.id}`}>Resumo</Link>
      </header>

      <AgentTabs agentId={agent.id} current="logs" />

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Nível</th>
              <th>Tipo</th>
              <th>Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.createdAt.toLocaleString("pt-BR")}</td>
                <td><span className={`badge ${event.level}`}>{event.level}</span></td>
                <td>{event.type}</td>
                <td>{event.message}</td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr><td colSpan={4} className="muted">Nenhum evento registrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
