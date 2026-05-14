# Tasks: Pharma Agent instalavel (plano 03)

**Input**: `specs/003-pharma-agent-instalador/`

## Phase 1: Setup

- [X] T001 [P] Adicionar `.gitignore` na raiz do monorepo
- [X] T002 [P] `pharma-agent/src/config/api-url.ts` — base URL (PHARMA_API_URL / config / legado)
- [X] T003 `pharma-agent/src/config/env-merge.ts` — PHARMA_AGENT_TOKEN, intervalo, log level

## Phase 2: Foundational

- [X] T004 `pharma-agent/src/types.ts` — campos opcionais apiUrl, syncIntervalSeconds, logLevel em LocalConfig
- [X] T005 `pharma-agent/src/api/remote-sync-config.ts` — cache ImportConfig via HTTP
- [X] T006 `pharma-agent/src/api/event-sink.ts` — POST eventos e heartbeat
- [X] T007 `pharma-agent/src/api/neo-command-mapper.ts` — command.* → AgentCommand

## Phase 3: Conexao e sync

- [X] T008 `pharma-agent/src/panel/client.ts` — WS por api-url, paths configuraveis, heartbeat, polling fallback, eventos, mapper neo + refreshConfig
- [X] T009 `pharma-agent/src/panel/register.ts` — registrar via base da API (path configuravel)
- [X] T010 `pharma-agent/src/config/panel-url.ts` — link de token: PHARMA_WEB_URL / legado / API
- [X] T011 `pharma-agent/src/index.ts` — merge env, agent.started, loop de sync com products:sync
- [X] T012 `pharma-agent/config.local.example.json` — exemplo com apiUrl

## Phase 4: Empacotamento Linux

- [X] T013 [P] `pharma-agent/packaging/linux/pharma-connector-agent.service`
- [X] T014 [P] `pharma-agent/packaging/linux/install.sh`

## Phase 5: Git (pre-requisito speckit)

- [X] T015 Commit inicial em branch `003-pharma-agent-instalador`
