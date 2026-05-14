# Research: Pharma Agent + NEO-API + instalador

## 1. Transporte: WebSocket primario + HTTP polling fallback

**Decision**: Manter WebSocket como canal principal; implementar fallback HTTP (long polling ou intervalo curto) quando WS indisponivel (proxy corporativo, TLS termination).

**Rationale**: Plano 03 exige ambos; WS ja existe no agente; polling e padrao simples sem novo broker.

**Alternatives considered**: SSE (menos comum em redes restritas); apenas WS (rejeitado pelo requisito explicito).

## 2. Autenticacao e URL base

**Decision**: Substituir `PHARMA_PANEL_URL` + `getPanelUrl()` por `PHARMA_API_URL` (ou `apiUrl` no JSON). Headers/query: manter `x-agent-id` + `x-agent-token` onde a API espelhar o painel, ou migrar para `Authorization: Bearer <token>` se a NEO-API padronizar assim — **a NEO-API deve ser fonte da verdade**; o agente implementa o que `contracts/agent-neo-api.md` fixar na primeira iteracao.

**Rationale**: Plano 03 lista variaveis novas e remove painel.

**Alternatives considered**: Manter compat dual (painel + API) — adiciona complexidade; usar apenas se necessario para migracao curta.

## 3. Nomenclatura de comandos: legado vs plano 03

**Decision**: Camada de adaptacao no agente mapeia `command.searchDatabases` → fluxos existentes (`database:deep-scan`, `database:files`, etc.) ate renomear de ponta a ponta; mesmo para `command.testDatabase` → `db:test`, `command.loadColumns` → `db:columns`, `command.syncNow` → `products:sync`, `command.refreshConfig` → reload de config + ack.

**Rationale**: Preserva logica de drivers e reduz risco; WEB/API podem falar o vocabulario do plano 03.

**Alternatives considered**: Renomear so no agente e quebrar painel atual — exige deploy sincrono de WEB + agente.

## 4. Heartbeat e “online” no WEB

**Decision**: Heartbeat como mensagem periodica ou endpoint REST `POST /agents/me/heartbeat` conforme API; servidor marca ultimo `seen_at` e estado online.

**Rationale**: Requisito explicito de visibilidade no WEB.

**Alternatives considered**: Apenas inferir online por WS connect — insuficiente se usar polling fallback.

## 5. Sync e source_hash

**Decision**: MVP: `source_hash` = hash estavel do registro normalizado (ex.: SHA-256 de JSON canonico de campos mapeados + identificador de linha origem) calculado no agente; envio em batch JSON; API faz upsert idempotente.

**Rationale**: Plano 03 pede `source_hash` e snapshot; evita depender de colunas `updated_at` no MVP.

**Alternatives considered**: Hash apenas do PK — mais rapido mas colide em updates sem deteccao.

## 6. Instalador Linux

**Decision**: Script `install.sh` servido estaticamente pela API (`curl ... | sudo bash`) que: cria usuario de servico, diretorios, copia binario/tarball Node empacotado (`pkg` ou distribuicao `node` + `npm ci --omit=dev` em `/opt`), escreve `/etc/pharma-connector-agent/config.json` com permissoes 600, instala unit systemd com `Restart=always`.

**Rationale**: Alinha a caminhos e comandos do plano 03.

**Alternatives considered**: Docker — bom para dev; farmacias frequentemente precisam de acesso direto ao arquivo .fdb no host.

## 7. Windows

**Decision**: Fase 2; WinSW + pacote do agente conforme recomendacao do plano 03.

**Rationale**: Escopo MVP e Linux.

## 8. CLI `pharma-agent`

**Decision**: Binario de entrada unico que delega: em desenvolvimento `tsx`/`node dist/index.js`; em producao mesmo binario com argv — subcomandos `install|uninstall|start|stop|restart|status|logs` implementados como thin wrappers sobre systemd (`systemctl`, `journalctl`) no Linux.

**Rationale**: Operacao homogenea com documentacao do plano 03.

**Alternatives considered**: Apenas systemd — menos ergonomia para suporte.
