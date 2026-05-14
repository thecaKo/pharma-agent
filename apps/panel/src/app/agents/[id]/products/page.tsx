import Link from "next/link";
import { AgentTabs } from "@/components/agent-tabs";
import { getAgentSummary, listAgentProducts } from "@/services/agents";

type Props = {
  params: { id: string };
  searchParams: { q?: string; status?: string };
};

export default async function AgentProductsPage({ params, searchParams }: Props) {
  const agent = await getAgentSummary(params.id);
  if (!agent) {
    return <p>Agente nao encontrado.</p>;
  }

  const status = searchParams.status ?? "active";
  const products = await listAgentProducts(agent.id, {
    status,
    query: searchParams.q,
    take: 150
  });

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Produtos</h1>
          <p>{agent.name}</p>
        </div>
        <Link className="button secondary" href={`/agents/${agent.id}/import`}>Sync</Link>
      </header>

      <AgentTabs agentId={agent.id} current="products" />

      <section className="panel">
        <div className="panel-body">
          <form className="grid" method="get">
            <label>
              Buscar
              <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Nome do produto" />
            </label>
            <label>
              Status
              <select name="status" defaultValue={status}>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="all">Todos</option>
              </select>
            </label>
            <div className="actions">
              <button type="submit">Filtrar</button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>ID externo</th>
              <th>Status</th>
              <th>Produto</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td><code>{product.externalId ?? "-"}</code></td>
                <td><span className={`badge ${product.active ? "success" : "failed"}`}>{product.active ? "ativo" : "inativo"}</span></td>
                <td>{product.name}</td>
                <td>{product.price ?? "-"}</td>
                <td>{product.stock ?? "-"}</td>
                <td>{product.updatedAt.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr><td colSpan={6} className="muted">Nenhum produto encontrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
