# Quickstart (dev): pharma-agent → NEO-API

## Prerequisitos

- Node 20+
- NEO-API e WEB rodando com os endpoints definidos em `contracts/agent-neo-api.md` (ou mocks).

## Config local (desenvolvimento)

1. Copiar `pharma-agent/config.local.example.json` para `pharma-agent/config.local.json`.
2. Preencher `apiUrl`, `agentId`, `agentName`, `token` (ou usar env quando implementado).

## Variaveis de ambiente (alvo)

```bash
export PHARMA_API_URL=https://api.exemplo.com
export PHARMA_AGENT_TOKEN=...
export PHARMA_SYNC_INTERVAL_SECONDS=15
export PHARMA_LOG_LEVEL=info
```

## Rodar em dev

```bash
cd pharma-agent
npm install
npm run dev
```

## Proximos passos de implementacao

- Substituir `connectToPanel` / `getPanelUrl` por cliente NEO-API.
- Mapear comandos para nomes `command.*`.
- Adicionar loop de sync por intervalo e emissao de eventos.
- Adicionar artefatos em `packaging/linux/` (systemd + install.sh) conforme `plan.md`.
