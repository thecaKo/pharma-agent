import { getPanelTokenUrl } from "../config/panel-url";
import { DatabaseFile, LocalConfig, RegisterAgentResponse } from "../types";

export function renderSetupForm(config: LocalConfig | null, status?: RegisterAgentResponse): string {
  const agentName = escapeHtml(config?.agentName ?? "");
  const token = escapeHtml(config?.token ?? "");
  const tokenUrl = escapeHtml(getPanelTokenUrl());
  const statusHtml = status ? renderStatus(status) : "";

  return html(`main {
      max-width: 640px;
      margin: 48px auto;
      font-family: Arial, sans-serif;
      color: #111827;
    }
    label {
      display: block;
      font-size: 14px;
      font-weight: 700;
      margin: 18px 0 6px;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      padding: 11px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 15px;
    }
    button {
      margin-top: 22px;
      padding: 11px 16px;
      border: 0;
      border-radius: 6px;
      background: #0f766e;
      color: white;
      font-weight: 700;
      cursor: pointer;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 22px;
      flex-wrap: wrap;
    }
    .actions button {
      margin-top: 0;
    }
    .secondary {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid #0f766e;
      border-radius: 6px;
      color: #0f766e;
      text-decoration: none;
      font-weight: 700;
    }
    .status {
      padding: 12px 14px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .success {
      background: #dcfce7;
      color: #166534;
    }
    .error {
      background: #fee2e2;
      color: #991b1b;
    }`, `<main>
    <h1>PharmaTunnel Agent</h1>
      <p>Configure o token gerado pelo painel para registrar este agente.</p>
      ${statusHtml}
      <form method="post" action="/setup">
        <label for="agentName">Nome do agente</label>
        <input id="agentName" name="agentName" required value="${agentName}" placeholder="Loja Centro" />

        <label for="token">Token</label>
        <input id="token" name="token" required value="${token}" placeholder="TOKEN_GERADO_NO_PAINEL" />

        <div class="actions">
          <button type="submit">Registrar agente</button>
          <a class="secondary" href="${tokenUrl}" target="_blank" rel="noreferrer">Gerar Token</a>
          <a class="secondary" href="/databases">Detectar bancos locais</a>
        </div>
      </form>
    </main>`);
}

export function renderFirebirdDetection(result: { roots: string[]; files: DatabaseFile[]; error?: string }): string {
  const rows = result.files.length
    ? result.files.map((file) => `<tr>
        <td>${escapeHtml(file.name)}</td>
        <td>${escapeHtml(file.databaseType)}</td>
        <td><code>${escapeHtml(file.extension)}</code></td>
        <td><code>${escapeHtml(file.path)}</code></td>
        <td>${escapeHtml(formatBytes(file.size))}</td>
        <td>${escapeHtml(formatDate(file.modifiedAt))}</td>
      </tr>`).join("")
    : `<tr><td colspan="6">Nenhum arquivo candidato de banco encontrado.</td></tr>`;
  const roots = result.roots.length
    ? result.roots.map((root) => `<li><code>${escapeHtml(root)}</code></li>`).join("")
    : "<li>Nenhuma pasta comum acessivel encontrada.</li>";
  const error = result.error ? `<div class="status error">${escapeHtml(result.error)}</div>` : "";

  return html(baseStyles(), `<main>
    <h1>Detectar bancos locais</h1>
    <p>Esta busca roda neste computador, onde o agente esta instalado, e procura arquivos candidatos de bancos usados em PDV.</p>
    ${error}
    <div class="actions">
      <a class="secondary" href="/setup">Voltar</a>
      <a class="secondary" href="/firebird">Detectar novamente</a>
      <a class="secondary" href="/firebird?mode=deep">Busca profunda</a>
    </div>
    <h2>Locais verificados</h2>
    <ul>${roots}</ul>
    <h2>Arquivos encontrados</h2>
    <table>
      <thead>
        <tr>
          <th>Arquivo</th>
          <th>Tipo provável</th>
          <th>Ext.</th>
          <th>Caminho</th>
          <th>Tamanho</th>
          <th>Modificado</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </main>`);
}

export function renderHealth(config: LocalConfig | null): string {
  return html("", `<main>
    <h1>PharmaTunnel Agent</h1>
    <pre>${escapeHtml(JSON.stringify({ configured: Boolean(config?.agentId), agentName: config?.agentName }, null, 2))}</pre>
  </main>`);
}

function renderStatus(status: RegisterAgentResponse): string {
  const className = status.success ? "success" : "error";
  const message = status.message ?? (status.success ? "Agente registrado com sucesso." : "Falha ao registrar agente.");
  return `<div class="status ${className}">${escapeHtml(message)}</div>`;
}

function html(style: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PharmaTunnel Agent</title>
    <style>${style}</style>
  </head>
  <body>${body}</body>
</html>`;
}

function baseStyles(): string {
  return `main {
      max-width: 920px;
      margin: 48px auto;
      font-family: Arial, sans-serif;
      color: #111827;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 12px;
    }
    th,
    td {
      border-bottom: 1px solid #e2e8f0;
      padding: 10px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: #64748b;
      font-size: 12px;
      text-transform: uppercase;
    }
    code {
      white-space: pre-wrap;
      word-break: break-word;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 22px 0;
      flex-wrap: wrap;
    }
    .secondary {
      display: inline-flex;
      align-items: center;
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid #0f766e;
      border-radius: 6px;
      color: #0f766e;
      text-decoration: none;
      font-weight: 700;
    }
    .status {
      padding: 12px 14px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .error {
      background: #fee2e2;
      color: #991b1b;
    }`;
}

function formatBytes(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | undefined): string {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("pt-BR");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[char];
  });
}
