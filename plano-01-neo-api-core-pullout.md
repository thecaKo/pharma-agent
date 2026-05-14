# Plano 01 - NEO-API e Core Pullout

## Objetivo

Transformar a NEO-API no backend oficial do Pharma Connector, usando o banco `core-pullout` como fonte central dos dados de stores, agentes, configuracoes, produtos, sincronizacoes e logs.

Fluxo alvo:

```txt
pharma-agent -> NEO-API -> core-pullout
web-pharmachatbot -> NEO-API -> core-pullout
```

O painel separado atual deixa de fazer parte do produto final.

## Banco

Usar o schema core da NEO-API:

```txt
../neo-api-pharmachatbot/src/drizzle/core/schema.ts
../neo-api-pharmachatbot/src/drizzle/core/migrations
```

Conexao ja existente:

```txt
DRIZZLE_CORE
DrizzleCoreModule
CORE_PULLOUT_DB_HOST
CORE_PULLOUT_DB_PORT
CORE_PULLOUT_DB_USERNAME
CORE_PULLOUT_DB_PASSWORD
CORE_PULLOUT_DB_DATABASE
```

## Tabelas

Criar no `core-pullout`:

```txt
pharma_connector_stores
pharma_connector_agents
pharma_connector_agent_tokens
pharma_connector_database_configs
pharma_connector_mappings
pharma_connector_products
pharma_connector_sync_runs
pharma_connector_events
```

Relacao principal:

```txt
core_company_id -> store_id -> agent_id -> products
```

## Store

`storeId` representa a caixa, loja, PDV ou unidade que possui aquele conjunto de produtos.

Campos principais:

```txt
id
core_company_id
name
external_code
status
created_at
updated_at
deleted_at
```

## Agent

Cada agente pertence a uma store.

Campos principais:

```txt
id
core_company_id
store_id
name
machine_id
version
status
last_seen_at
installed_at
created_at
updated_at
deleted_at
```

## Token

Salvar somente hash do token.

Campos principais:

```txt
id
agent_id
token_hash
token_prefix
revoked_at
last_used_at
created_at
updated_at
```

O token puro deve ser exibido apenas uma vez no WEB.

## Configuracao Do Banco Local

Campos principais:

```txt
id
agent_id
driver
host
port
database_path
database_name
username
encrypted_password
selected_table
connection_mode
created_at
updated_at
```

Senha e segredos devem ser criptografados pela NEO-API.

## Mapping

Campos principais:

```txt
id
agent_id
store_id
table_name
id_field
name_field
price_field
stock_field
barcode_field
unit_field
updated_at_field
active
created_at
updated_at
```

O campo `id_field` deve ser obrigatorio para permitir upsert confiavel.

## Produtos

Campos principais:

```txt
id
core_company_id
store_id
agent_id
external_product_id
code
barcode
name
price
stock
unit
raw_payload
source_hash
last_seen_at
created_at
updated_at
deleted_at
```

Chave unica recomendada:

```txt
store_id + external_product_id
```

Indices:

```txt
store_id
agent_id
barcode
external_product_id
updated_at
source_hash
```

## Modulo NestJS

Criar:

```txt
../neo-api-pharmachatbot/src/modules/pharma-connector
```

Estrutura:

```txt
controllers/
services/
repositories/
gateways/
guards/
dtos/
interfaces/
```

Todos os repositories devem usar:

```ts
@Inject(DRIZZLE_CORE)
```

## Endpoints Admin

Usados pelo WEB com JWT:

```txt
GET    /pharma-connector/stores
POST   /pharma-connector/stores
PUT    /pharma-connector/stores/:id

GET    /pharma-connector/agents
POST   /pharma-connector/agents
GET    /pharma-connector/agents/:id
POST   /pharma-connector/agents/:id/token
POST   /pharma-connector/agents/:id/revoke-token

GET    /pharma-connector/agents/:id/database
PUT    /pharma-connector/agents/:id/database

GET    /pharma-connector/agents/:id/mapping
PUT    /pharma-connector/agents/:id/mapping

GET    /pharma-connector/products?storeId=
GET    /pharma-connector/sync-runs?storeId=
GET    /pharma-connector/events?agentId=
```

## Endpoints De Comando

Admin dispara comando para agente:

```txt
POST /pharma-connector/agents/:id/commands/search-databases
POST /pharma-connector/agents/:id/commands/test-database
POST /pharma-connector/agents/:id/commands/load-columns
POST /pharma-connector/agents/:id/commands/sync-now
```

## Endpoints Do Agente

Usados pelo agente com token proprio:

```txt
POST /pharma-connector/agent/heartbeat
GET  /pharma-connector/agent/config
POST /pharma-connector/agent/events
POST /pharma-connector/agent/command-results
POST /pharma-connector/agent/products/snapshot
```

## WebSocket

Usar Socket.IO da NEO-API.

Eventos para o WEB:

```txt
agent.online
agent.offline
command.result
sync.started
sync.finished
sync.failed
event.created
products.updated
```

Eventos para o agente:

```txt
command.searchDatabases
command.testDatabase
command.loadColumns
command.syncNow
command.refreshConfig
```

## Sync

Fluxo:

```txt
agente le banco local
agente aplica mapping
agente normaliza produtos
agente calcula hash por produto
agente envia snapshot/batch para NEO-API
NEO-API faz upsert no core-pullout por store_id + external_product_id
NEO-API grava sync_run e events
WEB recebe evento products.updated
```

MVP:

```txt
snapshot em batch
upsert direto
logs basicos
```

Evolucao:

```txt
diff local
updated_at_field
source_hash
batch de 500/1000 produtos
fila BullMQ
retry com backoff
rate limit por agente
```

## Seguranca

- JWT para endpoints admin.
- Guard proprio para endpoints do agente.
- Token de agente salvo como hash.
- Credenciais de banco criptografadas.
- Logs nunca devem expor senha.
- Possibilidade de revogar token.
- Validar `core_company_id`, `store_id` e `agent_id` em todas as operacoes.

## Critérios De Pronto

- Schema core criado.
- Migrations geradas.
- Modulo `pharma-connector` registrado no `AppModule`.
- Admin consegue criar store e agente.
- Admin consegue gerar token.
- Agente autentica com token.
- NEO-API recebe heartbeat.
- NEO-API recebe snapshot de produtos.
- Produtos ficam gravados por `store_id`.
- Logs/sync runs ficam persistidos no core.
