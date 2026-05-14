# Data model: agente local e payloads NEO-API

## Entidade: AgentLocalConfig

| Campo | Tipo | Regras |
|-------|------|--------|
| apiUrl | string (URL) | HTTPS em producao; vem de `PHARMA_API_URL` ou arquivo |
| agentId | string | UUID ou id string emitido pelo WEB |
| agentToken | string | Obrigatorio; nunca logar |
| agentName | string | Exibicao |
| syncIntervalSeconds | number | Default 15; minimo sensato (ex.: 5) a validar na API |
| logLevel | enum | debug, info, warn, error |
| websocketUrl | string opcional | Override; senao derivado de apiUrl |

Relacionamento: 1 agente ↔ 1 arquivo config no disco; N stores possiveis do lado servidor (agente nao armazena lista de stores se a API empurrar mapping por comando).

## Entidade: RemoteStoreMapping (cache opcional)

Campos tipicos: `storeId`, driver, connection string ou parametros desestruturados, query ou tabela+colunas. **Fonte de verdade**: NEO-API; agente pode manter cache em memoria apos `command.refreshConfig`.

## Entidade: ProductRecord (normalizado antes do envio)

| Campo | Tipo | Regras |
|-------|------|--------|
| sourceId | string | Identifica linha no banco origem |
| sku / ean / descricao / etc. | conforme mapping | Validacao minima de tipos |
| source_hash | string | Hash do conteudo normalizado |

## Entidade: SyncBatch

| Campo | Tipo |
|-------|------|
| storeId | string |
| items | ProductRecord[] |
| mode | snapshot \| delta (MVP: snapshot) |

## Mensagem: Command (entrada)

| Campo | Tipo |
|-------|------|
| id | string (correlacao) |
| type | string (um dos command.*) |
| payload | objeto por tipo de comando |

## Mensagem: CommandResponse

| Campo | Tipo |
|-------|------|
| commandId | string |
| ok | boolean |
| error | string opcional |
| data | objeto opcional |

## Mensagem: Event (saida)

| Campo | Tipo |
|-------|------|
| type | string (um dos eventos do spec) |
| timestamp | ISO-8601 |
| payload | objeto (sem segredos) |

## Estado de runtime (nao persistido)

- `connectionState`: disconnected \| connecting \| connected
- `lastSyncAt`, `lastHeartbeatAt`
- `searchJob`: idle \| running (para nao bloquear)

## Transicoes

- `disconnected` → `connecting` (timer ou acao usuario) → `connected` (WS open ou polling ativo).
- `connected` → `disconnected` (close/erro) → backoff → `connecting`.
