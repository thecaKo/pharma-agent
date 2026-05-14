# Plano 03 - Pharma Agent e Instalador

## Objetivo

Transformar o `pharma-agent` em um servico instalavel, que roda em segundo plano na maquina da farmacia, conecta na NEO-API e sincroniza produtos automaticamente por store.

O usuario final nao deve depender de terminal para operar o agente.

## Fluxo Alvo

```txt
admin cria store no WEB
admin cria agente
WEB gera token
admin instala agente na maquina da farmacia
agente conecta na NEO-API
agente aparece online no WEB
admin configura banco e mapping pelo WEB
agente sincroniza produtos automaticamente
```

## Variaveis De Ambiente

Substituir dependencia do painel antigo por:

```env
PHARMA_API_URL=https://api.seudominio.com
PHARMA_AGENT_TOKEN=token_gerado_no_web
PHARMA_SYNC_INTERVAL_SECONDS=15
PHARMA_LOG_LEVEL=info
```

O agente nao deve mais depender de:

```env
PHARMA_PANEL_URL
```

## Responsabilidades Do Agente

O agente deve:

- autenticar na NEO-API com token proprio;
- enviar heartbeat periodico;
- receber comandos;
- buscar arquivos de banco local;
- testar conexao;
- listar tabelas/colunas;
- executar mapping;
- sincronizar produtos automaticamente;
- enviar logs/eventos para a NEO-API;
- reconectar sozinho quando cair;
- rodar como servico em segundo plano.

## Comandos Recebidos

Via WebSocket ou fallback HTTP polling:

```txt
command.searchDatabases
command.testDatabase
command.loadColumns
command.syncNow
command.refreshConfig
```

## Eventos Enviados

```txt
agent.started
agent.connected
agent.disconnected
database.search.started
database.search.finished
database.test.started
database.test.finished
columns.loaded
sync.started
sync.finished
sync.failed
error
```

## Sync De Produtos

Padrao:

```txt
15 segundos
```

Configuravel por:

```env
PHARMA_SYNC_INTERVAL_SECONDS
```

Fluxo:

```txt
carrega config da NEO-API
conecta no banco local
executa query conforme mapping
normaliza produtos
calcula source_hash
envia batch/snapshot para NEO-API
registra resultado
```

MVP:

- Enviar snapshot/batch.
- NEO-API faz upsert.
- Logs claros.

Evolucao:

- Enviar apenas alterados.
- Usar campo `updated_at` quando existir.
- Retry com backoff.
- Limitar batch por tamanho.

## Drivers

Manter suporte ja iniciado:

```txt
Firebird
SQLite
MySQL
PostgreSQL
SQL Server
Oracle
InterBase
```

Prioridade de robustez:

```txt
1. Firebird
2. SQLite
3. MySQL/PostgreSQL
4. SQL Server
5. Oracle/InterBase
```

## Busca De Bancos

Manter busca global por extensoes:

```txt
.fdb
.fbk
.gdb
.mdf
.ldf
.ndf
.bak
.sql
.dump
.backup
.frm
.ibd
.myd
.myi
.db
.sqlite
.sqlite3
.dbf
.ctl
.ora
.log
.ib
.ibk
```

Regras:

- Logs detalhados do que esta lendo.
- Ignorar pastas pesadas conhecidas.
- Ter limite de profundidade e resultados.
- Nao travar o agente durante busca.

## Instalador Linux

MVP recomendado primeiro.

Caminhos:

```txt
/opt/pharma-connector-agent
/etc/pharma-connector-agent/config.json
/var/log/pharma-connector-agent
```

Servico:

```txt
/etc/systemd/system/pharma-connector-agent.service
```

Comportamento:

```txt
iniciar com o sistema
reiniciar se cair
rodar em segundo plano
registrar logs no journalctl
```

Comandos esperados:

```bash
sudo systemctl enable pharma-connector-agent
sudo systemctl start pharma-connector-agent
sudo systemctl status pharma-connector-agent
journalctl -u pharma-connector-agent -f
```

Instalacao ideal:

```bash
curl -fsSL https://api.seudominio.com/pharma-connector/install.sh | sudo bash -s -- --token TOKEN
```

## Instalador Windows

Fase seguinte ao Linux.

Caminhos:

```txt
C:\Program Files\PharmaConnectorAgent
C:\ProgramData\PharmaConnectorAgent\config.json
C:\ProgramData\PharmaConnectorAgent\logs
```

Servico:

```txt
PharmaConnectorAgent
```

Comportamento:

```txt
iniciar com Windows
reiniciar se cair
rodar sem janela aberta
desinstalar limpo
```

Opcoes tecnicas:

```txt
WinSW
node-windows
NSIS
MSI
```

Recomendacao inicial:

```txt
WinSW + pacote do agente
```

Depois evoluir para instalador `.exe`/`.msi`.

## CLI Do Agente

Comandos para suporte:

```bash
pharma-agent install --api URL --token TOKEN
pharma-agent uninstall
pharma-agent start
pharma-agent stop
pharma-agent restart
pharma-agent status
pharma-agent logs
```

No uso normal, o admin deve instalar pelo WEB e nao operar manualmente.

## Config Local

Arquivo:

```json
{
  "apiUrl": "https://api.seudominio.com",
  "agentToken": "xxx",
  "syncIntervalSeconds": 15,
  "logLevel": "info"
}
```

Regras:

- Permissao restrita.
- Nao logar token.
- Nao logar senha de banco.
- Permitir refresh de config pela NEO-API.

## Auto Update

Nao entra no MVP.

Ordem correta:

```txt
1. servico estavel
2. logs
3. instalador
4. monitoramento
5. auto-update assinado
```

## Critérios De Pronto

- Agente conecta na NEO-API com token.
- Agente envia heartbeat.
- Agente recebe comandos.
- Agente executa busca de bancos.
- Agente testa conexao.
- Agente lista colunas.
- Agente sincroniza produtos a cada 15 segundos por padrao.
- Agente envia logs para a NEO-API.
- Agente roda como servico Linux.
- Agente reinicia automaticamente se cair.
- WEB mostra o agente online apos instalacao.
