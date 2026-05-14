import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentTabs } from "@/components/agent-tabs";
import { Toast } from "@/components/toast";
import { getAgent } from "@/services/agents";
import { fetchColumns } from "@/services/commands";
import { toDbConfig } from "@/services/database-configs";
import { saveMapping } from "@/services/mappings";
import { ProductMapping } from "@/types/agent";

type Props = {
  params: { id: string };
  searchParams: { table?: string; saved?: string; error?: string };
};

async function saveMappingAction(agentId: string, formData: FormData) {
  "use server";
  const mapping: ProductMapping = {
    table: String(formData.get("table") ?? "").trim(),
    idField: String(formData.get("idField") ?? "").trim(),
    nameField: String(formData.get("nameField") ?? "").trim(),
    priceField: optional(formData.get("priceField")),
    stockField: optional(formData.get("stockField")),
    imageField: optional(formData.get("imageField"))
  };

  if (!mapping.table || !mapping.idField || !mapping.nameField) {
    redirect(`/agents/${agentId}/mapping?error=${encodeURIComponent("Tabela, ID e campo de nome sao obrigatorios.")}`);
  }

  await saveMapping(agentId, mapping);
  redirect(`/agents/${agentId}/mapping?table=${encodeURIComponent(mapping.table)}&saved=1`);
}

export default async function MappingPage({ params, searchParams }: Props) {
  const agent = await getAgent(params.id);
  if (!agent) {
    return <p>Agente nao encontrado.</p>;
  }

  const table = searchParams.table ?? agent.mapping?.tableName ?? "";
  let columns: string[] = [];
  let error = searchParams.error;

  if (table && agent.database) {
    try {
      const data = await fetchColumns(agent.id, toDbConfig(agent.database), table) as { columns?: string[] };
      columns = data.columns ?? [];
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "Falha ao buscar colunas.";
    }
  }

  const action = saveMappingAction.bind(null, agent.id);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Mapping</h1>
          <p>{agent.name}</p>
        </div>
        <Link className="button secondary" href={`/agents/${agent.id}/schema?fetch=1`}>Schema</Link>
      </header>

      <AgentTabs agentId={agent.id} current="mapping" />

      <Toast status={error ? "error" : searchParams.saved ? "success" : undefined} message={error ?? (searchParams.saved ? "Mapping salvo." : undefined)} />

      <section className="panel">
        <form action={action} className="panel-body">
          <div className="grid">
            <label>
              Tabela
              <input name="table" required defaultValue={table} placeholder="produtos" />
            </label>
            <FieldSelect
              label="ID do produto"
              name="idField"
              required
              columns={columns}
              defaultValue={agent.mapping?.idField ?? undefined}
            />
            <FieldSelect
              label="Nome"
              name="nameField"
              required
              columns={columns}
              defaultValue={agent.mapping?.nameField}
            />
            <FieldSelect
              label="Preço"
              name="priceField"
              columns={columns}
              defaultValue={agent.mapping?.priceField ?? undefined}
            />
            <FieldSelect
              label="Estoque"
              name="stockField"
              columns={columns}
              defaultValue={agent.mapping?.stockField ?? undefined}
            />
            <FieldSelect
              label="Imagem"
              name="imageField"
              columns={columns}
              defaultValue={agent.mapping?.imageField ?? undefined}
            />
          </div>
          <div className="actions">
            <button type="submit" disabled={!table}>Salvar mapping</button>
            <Link className="button secondary" href={`/agents/${agent.id}/import`}>Importação</Link>
          </div>
        </form>
      </section>
    </>
  );
}

function FieldSelect({
  label,
  name,
  columns,
  defaultValue,
  required
}: {
  label: string;
  name: string;
  columns: string[];
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <select name={name} required={required} defaultValue={defaultValue ?? ""}>
        <option value="">{required ? "Selecione uma coluna" : "Nao mapear"}</option>
        {columns.map((column) => (
          <option key={column} value={column}>{column}</option>
        ))}
      </select>
    </label>
  );
}

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}
