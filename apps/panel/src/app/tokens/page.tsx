import Link from "next/link";
import { listTokens } from "@/services/tokens";

export default async function TokensPage() {
  const tokens = await listTokens();

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Tokens</h1>
          <p>Tokens de instalação usados pelo agente local.</p>
        </div>
        <Link className="button" href="/tokens/new">Gerar token</Link>
      </header>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Status</th>
              <th>Agente</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id}>
                <td><code>{token.token}</code></td>
                <td><span className={`badge ${token.status}`}>{token.status}</span></td>
                <td>{token.agent?.name ?? "Sem agente"}</td>
                <td>{token.createdAt.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {tokens.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">Nenhum token gerado.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
