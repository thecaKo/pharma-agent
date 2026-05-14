# Implementation Plan: Pharma Agent instalavel e NEO-API

**Branch**: `003-pharma-agent-instalador` (diretorio fixo via `.specify/feature.json`; git ainda sem `HEAD` valido) | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-pharma-agent-instalador/spec.md` (derivada de `plano-03-pharma-agent-instalador.md`)

**Note**: Gerado pelo fluxo `/speckit-plan`. Artefatos Phase 0/1: [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md), [contracts/](./contracts/).

## Summary

Transformar `pharma-agent` (Node/TypeScript, WebSocket para painel legado, Express setup local, comandos `db:*` / `products:*`) em cliente da **NEO-API**: autenticacao por token, heartbeat, canal de comandos alinhado ao plano 03, sync periodica de produtos com envio de eventos/logs, configuracao por env + arquivo em paths de instalador Linux, e empacotamento **systemd** (MVP). O backend Next (`apps/panel`) e a NEO-API precisam expor os endpoints/socket e persistencia coerentes com os contratos em `contracts/`.

## Technical Context

**Language/Version**: TypeScript / Node 20 LTS (alinhado a `pharma-agent` atual)

**Primary Dependencies**: `ws`, `express`, drivers (`node-firebird`, `better-sqlite3`, `mysql2`, `pg`, `mssql`, `oracledb`), empacotamento CLI futuro (ex.: `commander` ou subcomandos via `node` + script)

**Storage**: Arquivo JSON local (`config.local.json` hoje → `/etc/pharma-connector-agent/config.json` alvo); sem DB embutido no agente; estado remoto na NEO-API

**Testing**: `node:test` ou `vitest` (a definir no repo; hoje sem suite formal no pacote agente)

**Target Platform**: Linux x64/arm64 (MVP servico); Windows servico fase 2

**Project Type**: CLI / long-running agent (daemon) + instalador shell + unit systemd

**Performance Goals**: Sync default 15s por store; busca de arquivos nao bloqueante; limites de profundidade/resultados na busca (plano 03)

**Constraints**: Nao logar token nem credenciais de banco; reconexao WS; fallback polling; offline parcial (fila leve ou best-effort conforme API)

**Scale/Scope**: Uma farmacia / varias stores por tenant; batches de produto dimensionados pela API

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` ainda contem placeholders nao ratificados. Para esta entrega aplicam-se gates explicitos do spec/plano 03:

| Gate | Status |
|------|--------|
| Seguranca: sem segredos em logs estruturados | Atendido por desenho (redacao de payloads, permissoes 0600 no config) |
| Observabilidade: eventos e niveis de log | Atendido (lista de eventos no spec) |
| Simplicidade: MVP snapshot antes de delta | Atendido |
| Deploy: systemd reinicia servico | Atendido no escopo Linux MVP |

Re-check pos-design: contratos em `contracts/agent-neo-api.md` cobrem comandos/eventos; `data-model.md` separa entidades locais vs API; sem novos gates bloqueantes.

## Project Structure

### Documentation (this feature)

```text
specs/003-pharma-agent-instalador/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── agent-neo-api.md
└── tasks.md              # Phase 2: /speckit-tasks (nao gerado aqui)
```

### Source Code (repository root)

```text
pharma-agent/
├── package.json
├── src/
│   ├── index.ts                 # bootstrap: config, conexao API, setup opcional
│   ├── config/                  # load/save config; ler PHARMA_API_*
│   ├── panel/                   # legado: renomear/adaptar para cliente NEO-API
│   ├── commands/                # mapear tipos legado → command.* do plano 03
│   ├── db/                      # drivers existentes
│   └── setup/                   # servidor local setup (pode permanecer ou ser desativado pos-WEB)
apps/
└── panel/                       # WEB: store, agente, token, online, mapping (coordenacao com API)
```

**Structure Decision**: Implementacao principal no pacote `pharma-agent`; alteracoes de protocolo e UX no `apps/panel` e na camada NEO-API quando existir no monorepo (fora de `pharma-agent`, seguir o mesmo contrato em `contracts/`).

## Complexity Tracking

Nenhuma violacao de constitution ratificada a justificar.

## Phase 0 e 1 (referencia)

- Pesquisa consolidada: [research.md](./research.md)
- Modelo de dados: [data-model.md](./data-model.md)
- Contrato interface externa: [contracts/agent-neo-api.md](./contracts/agent-neo-api.md)
- Quickstart: [quickstart.md](./quickstart.md)
