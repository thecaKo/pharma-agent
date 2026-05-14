import Link from "next/link";
import { AgentTabs } from "@/components/agent-tabs";
import { getAgentSummary } from "@/services/agents";
import { listAgentEvents } from "@/services/events";

type Props = {
  params: { id: string };
};

export default async function AgentOverviewPage({ params }: Props) {
  const agent = await getAgentSummary(params.id);
  if (!agent) {
    return <p>Agente nao encontrado.</p>;
  }

  const events = await listAgentEvents(agent.id, 8);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>{agent.name}</h1>
          <p>Instalação conectada à plataforma</p>
        </div>
        <span className={`badge ${agent.status}`}>{agent.status}</span>
      </header>

      <AgentTabs agentId={agent.id} current="" />

      <section className="summary-grid">
        <div className="metric">
          <strong>{agent.status}</strong>
          <span>{agent.lastSeenAt ? `último contato ${agent.lastSeenAt.toLocaleString("pt-BR")}` : "sem contato"}</span>
        </div>
        <div className="metric">
          <strong>{agent.database?.driver ?? "-"}</strong>
          <span>{agent.database?.database ?? "banco não configurado"}</span>
        </div>
        <div className="metric">
          <strong>{agent._count.products}</strong>
          <span>produtos ativos</span>
        </div>
        <div className="metric">
          <strong>ativo</strong>
          <span>{agent.syncConfig?.lastSyncAt ? `sync ${agent.syncConfig.lastSyncAt.toLocaleString("pt-BR")}` : "sync nunca executado"}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-body">
          <h2>Próximos passos</h2>
          <div className="actions">
            <Link className="button secondary" href={`/agents/${agent.id}/database`}>Configurar banco</Link>
            <Link className="button secondary" href={`/agents/${agent.id}/mapping`}>Configurar mapping</Link>
            <Link className="button" href={`/agents/${agent.id}/import`}>Abrir sync</Link>
            <Link className="button secondary" href={`/agents/${agent.id}/products`}>Ver produtos</Link>
          </div>
        </div>
      </section>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Evento</th>
              <th>Nível</th>
              <th>Mensagem</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.type}</td>
                <td><span className={`badge ${event.level}`}>{event.level}</span></td>
                <td>{event.message}</td>
                <td>{event.createdAt.toLocaleString("pt-BR")}</td>
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
