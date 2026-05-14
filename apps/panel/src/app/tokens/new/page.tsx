import { redirect } from "next/navigation";
import { createToken } from "@/services/tokens";

type Props = {
  searchParams: { token?: string };
};

async function generateToken() {
  "use server";
  const token = await createToken();
  redirect(`/tokens/new?token=${encodeURIComponent(token.token)}`);
}

export default function NewTokenPage({ searchParams }: Props) {
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Gerar token</h1>
          <p>Crie um token e cole no setup local do PharmaTunnel Agent.</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-body">
          {searchParams.token ? (
            <>
              <label>
                Token gerado
                <input readOnly value={searchParams.token} />
              </label>
              <p className="muted" style={{ marginTop: 12 }}>
                Copie este valor para o agente local. Ele sera marcado como conectado quando o agente registrar.
              </p>
            </>
          ) : (
            <p className="muted">Nenhum token gerado nesta tela ainda.</p>
          )}
          <form action={generateToken} className="actions">
            <button type="submit">Gerar token</button>
          </form>
        </div>
      </section>
    </>
  );
}
