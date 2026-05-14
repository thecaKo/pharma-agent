import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentTabs } from "@/components/agent-tabs";
import { Toast } from "@/components/toast";
import { getAgent } from "@/services/agents";
import { getDefaultSyncIntervalSeconds, markSyncFailed, runProductSync, updateSyncConfig } from "@/services/sync";

type Props = {
  params: { id: string };
  searchParams: { status?: string; message?: string };
};

async function syncNowAction(agentId: string) {
  "use server";
  let status = "success";
  let message = "Sincronizacao finalizada.";

  try {
    await runProductSync(agentId);
  } catch (error) {
    status = "error";
    message = error instanceof Error ? error.message : "Falha ao sincronizar produtos.";
    await markSyncFailed(agentId, message);
  }

  redirect(`/agents/${agentId}/import?status=${status}&message=${encodeURIComponent(message)}`);
}

async function saveSyncConfigAction(agentId: string, formData: FormData) {
  "use server";
  const intervalSeconds = Number(formData.get("intervalSeconds") ?? getDefaultSyncIntervalSeconds());

  await updateSyncConfig(agentId, { intervalSeconds });
  redirect(`/agents/${agentId}/import?status=success&message=${encodeURIComponent("Configuracao de sync salva.")}`);
}

export default async function ImportPage({ params, searchParams }: Props) {
  const agent = await getAgent(params.id);
  if (!agent) {
    return <p>Agente nao encontrado.</p>;
  }

  const syncNow = syncNowAction.bind(null, agent.id);
  const saveSyncConfig = saveSyncConfigAction.bind(null, agent.id);
  const syncConfig = agent.syncConfig;
  const defaultIntervalSeconds = getDefaultSyncIntervalSeconds();
  const intervalSeconds = syncConfig?.intervalSeconds ?? defaultIntervalSeconds;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Importação</h1>
          <p>{agent.name}</p>
        </div>
        <Link className="button secondary" href={`/agents/${agent.id}/mapping`}>Mapping</Link>
      </header>

      <AgentTabs agentId={agent.id} current="import" />

      <Toast status={searchParams.status} message={searchParams.message} />

      <section className="panel">
        <div className="panel-body">
          <div className="summary-grid">
            <div className="metric">
              <strong>Ativo</strong>
              <span>sync automático</span>
            </div>
            <div className="metric">
              <strong>{syncConfig?.lastSyncAt ? syncConfig.lastSyncAt.toLocaleString("pt-BR") : "Nunca"}</strong>
              <span>último sync</span>
            </div>
            <div className="metric">
              <strong>{syncConfig?.lastUpdated ?? 0}</strong>
              <span>produtos atualizados</span>
            </div>
            <div className="metric">
              <strong>{syncConfig?.lastCreated ?? 0}</strong>
              <span>produtos novos</span>
            </div>
          </div>

          <form action={saveSyncConfig} className="grid">
            <label>
              Sincronizar a cada
              <select name="intervalSeconds" defaultValue={String(intervalSeconds)}>
                <option value="15">15 segundos</option>
                <option value="30">30 segundos</option>
                <option value="60">1 minuto</option>
                <option value="300">5 minutos</option>
              </select>
            </label>
            <div className="actions">
              <button type="submit" disabled={!agent.database || !agent.mapping?.idField}>Salvar configuração</button>
              <button formAction={syncNow} type="submit" disabled={!agent.database || !agent.mapping?.idField}>Sincronizar agora</button>
            </div>
          </form>

          <div className="grid" style={{ marginTop: 18 }}>
            <div>
              <strong>Banco</strong>
              <p className="muted">{agent.database ? `${agent.database.driver} / ${agent.database.database}` : "Nao configurado"}</p>
            </div>
            <div>
              <strong>Mapping</strong>
              <p className="muted">{agent.mapping ? `${agent.mapping.tableName} / ID ${agent.mapping.idField ?? "-"} -> ${agent.mapping.nameField}` : "Nao configurado"}</p>
            </div>
            <div>
              <strong>Último resultado</strong>
              <p className="muted">{syncConfig?.lastStatus ? `${syncConfig.lastStatus}: ${syncConfig.lastMessage ?? ""}` : "-"}</p>
            </div>
            <div>
              <strong>Total lido</strong>
              <p className="muted">{syncConfig?.lastTotalRows ?? "-"}</p>
            </div>
          </div>
        </div>
      </section>

      {agent.products.length ? (
        <section className="panel">
          <div className="panel-body">
            <h2 style={{ fontSize: 16, marginTop: 0 }}>Últimos produtos sincronizados</h2>
          </div>
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
              {agent.products.map((product) => (
                <tr key={product.id}>
                  <td><code>{product.externalId ?? "-"}</code></td>
                  <td><span className={`badge ${product.active ? "success" : "failed"}`}>{product.active ? "ativo" : "inativo"}</span></td>
                  <td>{product.name}</td>
                  <td>{product.price ?? "-"}</td>
                  <td>{product.stock ?? "-"}</td>
                  <td>{product.updatedAt.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
