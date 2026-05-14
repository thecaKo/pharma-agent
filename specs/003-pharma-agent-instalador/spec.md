# Feature: Pharma Agent instalavel e integracao NEO-API

**Fonte**: `plano-03-pharma-agent-instalador.md`

## Objetivo

Servico instalavel na maquina da farmacia que conecta na NEO-API, autentica com token emitido pelo WEB, envia heartbeat, recebe comandos remotos, opera sobre banco local (multi-driver) e sincroniza produtos por store em intervalo configuravel, sem depender de terminal para o usuario final.

## Fluxo de negocio

1. Admin cria store no WEB.
2. Admin cria agente no WEB.
3. WEB gera token de agente.
4. Admin instala o agente na maquina (instalador/script).
5. Agente conecta na NEO-API com token.
6. Agente aparece online no WEB.
7. Admin configura banco e mapping pelo WEB.
8. Agente sincroniza produtos automaticamente.

## Configuracao

### Variaveis de ambiente (substituir painel legado)

- `PHARMA_API_URL` — base URL da NEO-API (HTTPS).
- `PHARMA_AGENT_TOKEN` — token gerado no WEB.
- `PHARMA_SYNC_INTERVAL_SECONDS` — default 15.
- `PHARMA_LOG_LEVEL` — default `info`.

### Remover dependencia

- Nao usar `PHARMA_PANEL_URL` no fluxo novo.

### Arquivo local (alvo instalador Linux)

- `/etc/pharma-connector-agent/config.json` (ou equivalente documentado) com `apiUrl`, `agentToken`, `syncIntervalSeconds`, `logLevel`.
- Permissoes restritas; nunca logar token nem senha de banco.

## Comportamento do agente

- Autenticar na NEO-API com token proprio.
- Heartbeat periodico.
- Receber comandos (WebSocket com fallback HTTP polling).
- Buscar arquivos de banco local (extensoes e regras do plano 03).
- Testar conexao; listar tabelas/colunas; aplicar mapping.
- Sincronizar produtos automaticamente (MVP: snapshot/batch + upsert na API).
- Enviar logs/eventos para NEO-API.
- Reconexao automatica.
- Rodar como servico em segundo plano (systemd Linux no MVP).

## Comandos remotos (contrato alvo)

- `command.searchDatabases`
- `command.testDatabase`
- `command.loadColumns`
- `command.syncNow`
- `command.refreshConfig`

## Eventos (contrato alvo)

- `agent.started`, `agent.connected`, `agent.disconnected`
- `database.search.started`, `database.search.finished`
- `database.test.started`, `database.test.finished`
- `columns.loaded`
- `sync.started`, `sync.finished`, `sync.failed`
- `error`

## Sync de produtos

- Carregar config da NEO-API; conectar banco local; query conforme mapping; normalizar; `source_hash`; enviar batch/snapshot; registrar resultado.
- MVP: batch/snapshot completo; evolucao: delta, `updated_at`, backoff, limite de batch.

## Drivers

Manter e priorizar: Firebird, SQLite, MySQL/PostgreSQL, SQL Server, Oracle, InterBase (ordem de robustez do plano 03).

## Instalacao

- **Linux MVP**: paths `/opt/pharma-connector-agent`, config em `/etc/...`, logs `/var/log/...`, unit systemd `pharma-connector-agent.service`, `install.sh` via curl com `--token`.
- **Windows**: fase posterior; WinSW + pacote; caminhos Program Files / ProgramData.

## CLI (suporte)

`install`, `uninstall`, `start`, `stop`, `restart`, `status`, `logs` — uso normal via WEB.

## Fora do escopo MVP

- Auto-update assinado.

## Criterios de pronto

Conforme lista em plano-03 (conexao token, heartbeat, comandos, busca DB, teste, colunas, sync 15s default, logs na API, servico Linux, restart automatico, online no WEB).
