import Link from "next/link";
import { listEvents } from "@/services/events";

export default async function EventsPage() {
  const events = await listEvents();

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Eventos</h1>
          <p>Histórico operacional dos agentes conectados.</p>
        </div>
      </header>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Farmácia</th>
              <th>Nível</th>
              <th>Tipo</th>
              <th>Mensagem</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.createdAt.toLocaleString("pt-BR")}</td>
                <td><Link className="table-link" href={`/agents/${event.agentId}`}>{event.agent.name}</Link></td>
                <td><span className={`badge ${event.level}`}>{event.level}</span></td>
                <td>{event.type}</td>
                <td>{event.message}</td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr><td colSpan={5} className="muted">Nenhum evento registrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
