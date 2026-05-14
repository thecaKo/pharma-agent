import Link from "next/link";
import { listAgents, listProducts } from "@/services/agents";

type Props = {
  searchParams: { agentId?: string; q?: string };
};

export default async function ProductsPage({ searchParams }: Props) {
  const agents = await listAgents();
  const selectedAgentId = searchParams.agentId ?? "";
  const products = selectedAgentId
    ? await listProducts({ agentId: selectedAgentId, query: searchParams.q, take: 10 })
    : [];

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Produtos</h1>
          <p>Selecione uma farmácia para verificar até 10 produtos ativos sincronizados.</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-body">
          <form className="grid" method="get">
            <label>
              Farmácia
              <select name="agentId" required defaultValue={selectedAgentId}>
                <option value="">Selecione uma farmácia</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </label>
            <label>
              Buscar
              <input name="q" defaultValue={searchParams.q ?? ""} placeholder="Nome do produto" />
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
              <th>Produto</th>
              <th>Farmácia</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td><Link className="table-link" href={`/agents/${product.agentId}`}>{product.agent.name}</Link></td>
                <td>{product.price ?? "-"}</td>
                <td>{product.stock ?? "-"}</td>
                <td>{product.updatedAt.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  {selectedAgentId ? "Nenhum produto encontrado para esta farmácia." : "Selecione uma farmácia para carregar os produtos."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
