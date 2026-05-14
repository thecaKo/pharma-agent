# Contrato: Agente ↔ NEO-API

Documento normativo para implementacao paralela do `pharma-agent`, do WEB e da NEO-API. Ajustar paths HTTP para o padrao real da API na primeira sprint de integracao.

## Autenticacao

- Agente apresenta `agentId` e token (header `x-agent-id`, `x-agent-token`, **ou** `Authorization: Bearer <token>` com `agentId` em claim/path — escolher uma variante e manter em todos os ambientes).
- Respostas `401` / `403`: agente deve parar de spammar, aplicar backoff e opcionalmente sinalizar `agent.disconnected` com motivo sanitizado.

## WebSocket (primario)

- URL derivada de `apiUrl`: por convencao `wss://{host}/v1/agents/stream` (placeholder — **substituir pelo path real**).
- Frames: JSON texto. Tipos base:
  - Servidor → agente: envelope `{ "type": "command", "payload": { "id", "type", "payload" } }`
  - Agente → servidor: `{ "type": "event", "payload": { ... } }` ou `{ "type": "command:response", "payload": { ... } }`

## HTTP polling (fallback)

- `GET /v1/agents/me/commands?since=<cursor>` retorna fila ou 204.
- Eventos podem usar `POST /v1/agents/me/events` em batch quando WS inativo.

## Heartbeat

- `POST /v1/agents/me/heartbeat` com body `{ "agentId", "version", "hostname" }` a cada intervalo (ex.: 30s) ou conforme API.
- Ou heartbeat via frame WS `{ "type": "heartbeat" }`.

## Comandos (servidor → agente)

| type | payload esperado | resposta data |
|------|------------------|---------------|
| command.searchDatabases | `{ maxDepth, maxResults, roots? }` | lista de candidatos |
| command.testDatabase | credenciais ou referencia a config salva no servidor | ok + mensagem driver |
| command.loadColumns | selecao tabela/query | colunas |
| command.syncNow | `{ storeId? }` | resumo contagem / ids |
| command.refreshConfig | vazio | config aplicada |

## Eventos (agente → servidor)

Tipos exatamente como no spec: `agent.started`, `agent.connected`, `agent.disconnected`, `database.search.started`, `database.search.finished`, `database.test.started`, `database.test.finished`, `columns.loaded`, `sync.started`, `sync.finished`, `sync.failed`, `error`.

Payloads nao incluem token, senha de banco nem connection string completa (usar mascaramento).

## Sync de produtos

- `POST /v1/stores/{storeId}/products:snapshot` (ou nome equivalente) com body `{ "items": [ { "sourceId", "source_hash", ...campos } ] }`.
- Resposta: contagem aceita, erros parciais por item se suportado.

## Instalador

- `GET /pharma-connector/install.sh` retorna script que aceita `--token` e opcionalmente `--api-url`.
