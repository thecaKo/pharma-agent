import Link from "next/link";
import { listAgents } from "@/services/agents";

export default async function AgentsPage() {
  const agents = await listAgents();

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Farmácias</h1>
          <p>Cada agente representa uma instalação conectada à plataforma.</p>
        </div>
        <Link className="button secondary" href="/tokens/new">Novo acesso</Link>
      </header>

      <section className="summary-grid">
        <div className="metric">
          <strong>{agents.length}</strong>
          <span>instalações</span>
        </div>
        <div className="metric">
          <strong>{agents.filter((agent) => agent.status === "online").length}</strong>
          <span>online</span>
        </div>
        <div className="metric">
          <strong>{agents.filter((agent) => agent.database && agent.mapping?.idField).length}</strong>
          <span>sync ativo</span>
        </div>
      </section>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Instalação</th>
              <th>Status</th>
              <th>Banco</th>
              <th>Sync</th>
              <th>Produtos</th>
              <th>Último contato</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((agent) => (
              <tr key={agent.id}>
                <td>
                  <Link className="table-link" href={`/agents/${agent.id}`}>{agent.name}</Link>
                  <div className="muted">ID {agent.id}</div>
                </td>
                <td><span className={`badge ${agent.status}`}>{agent.status}</span></td>
                <td>{agent.database ? `${agent.database.driver} / ${agent.database.database}` : "Nao configurado"}</td>
                <td>
                  <span className="badge success">ativo</span>
                  <div className="muted">{agent.syncConfig?.lastSyncAt ? agent.syncConfig.lastSyncAt.toLocaleString("pt-BR") : "nunca"}</div>
                </td>
                <td>{agent._count.products}</td>
                <td>{agent.lastSeenAt ? agent.lastSeenAt.toLocaleString("pt-BR") : "Nunca"}</td>
              </tr>
            ))}
            {agents.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">Nenhum agente registrado.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
