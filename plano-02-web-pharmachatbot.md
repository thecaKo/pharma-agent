# Plano 02 - WEB-PHARMACHATBOT

## Objetivo

Usar o WEB-PHARMACHATBOT como painel oficial do Pharma Connector, mantendo o padrao visual e estrutural das paginas de integracao existentes.

O painel separado atual deve ser usado apenas como referencia de fluxo.

## Local Da Implementacao

Repositorio:

```txt
../web-pharmachatbot
```

Nova pagina:

```txt
src/pages/Integrations/pages/PharmaConnector
```

Novo service:

```txt
src/services/Integrations/PharmaConnector.ts
```

Nova rota:

```txt
/integrations/pharma-connector
```

Usar `neoApi`:

```txt
src/services/neoApi.tsx
```

## Padrao Visual

Seguir o padrao das paginas atuais em:

```txt
src/pages/Integrations/pages/Trier
src/pages/Integrations/pages/Api
src/pages/Integrations/pages/Webhooks
```

Manter:

```txt
layout existente
botao padrao
input padrao
toast padrao
loading padrao
permissao admin
estrutura de services
```

## Fluxo Principal

Fluxo que o admin deve seguir:

```txt
1. Criar store
2. Criar agente vinculado a store
3. Gerar token
4. Instalar agente
5. Ver agente online
6. Buscar arquivo do banco
7. Testar conexao
8. Mapear colunas
9. Ver produtos sincronizados
10. Acompanhar logs
```

## Estrutura Da Pagina

Criar uma experiencia unica de integracao com secoes ou abas:

```txt
Stores
Agentes
Banco local
Mapeamento
Produtos
Logs
```

A pagina deve parecer uma integracao nativa, nao um painel externo embutido.

## Service

Criar funcoes:

```ts
listStores()
createStore()
updateStore()

listAgents()
createAgent()
getAgent()
generateAgentToken()
revokeAgentToken()

getDatabaseConfig()
saveDatabaseConfig()

getMapping()
saveMapping()

searchDatabases()
testDatabase()
loadColumns()
syncNow()

listProducts()
listSyncRuns()
listEvents()
```

Todas devem usar `neoApi`.

## Tela Stores

Objetivo: administrar as caixas/lojas/unidades que possuem produtos.

Campos:

```txt
Nome
Codigo externo opcional
Status
```

Tabela:

```txt
Nome
Codigo externo
Status
Agentes
Produtos
Atualizado em
```

Acoes:

```txt
Criar store
Editar store
Selecionar store ativa
```

## Tela Agentes

Objetivo: administrar instalacoes do agente por store.

Tabela:

```txt
Nome
Store
Status
Versao
Ultima conexao
Ultimo sync
Produtos
```

Acoes:

```txt
Criar agente
Gerar token
Copiar comando Linux
Baixar instalador Windows
Revogar token
Abrir configuracao
```

Status:

```txt
online
offline
sem token
erro
```

## Tela Banco Local

Objetivo: configurar o banco que o agente vai ler.

Botao principal:

```txt
Buscar arquivo do banco
```

Fluxo:

```txt
WEB chama NEO-API
NEO-API envia comando ao agente
agente busca arquivos
agente retorna resultados
WEB mostra resultados
admin seleciona arquivo
WEB detecta driver pela extensao
admin testa conexao
admin salva configuracao
```

Tabela de resultados:

```txt
Arquivo
Tipo provavel
Extensao
Caminho
Tamanho
Modificado
Acao
```

Regras:

- Filtro por tipo deve filtrar resultados ja carregados.
- Selecionar arquivo nao pode iniciar nova busca.
- Caminho longo deve ter trim visual e tooltip.
- Driver deve mudar automaticamente pela extensao quando houver correspondencia.

## Tela Mapeamento

Objetivo: mapear colunas do banco local para produto normalizado.

Ao entrar:

- Se existir banco configurado e tabela selecionada, buscar colunas automaticamente.
- Nao depender de botao manual para buscar colunas.

Campos:

```txt
Tabela
ID produto
Nome
Preco
Estoque
Codigo de barras
Unidade
Atualizado em
```

Regras:

- `ID produto` obrigatorio.
- Salvar mapping na NEO-API.
- Depois de salvar, agente deve receber `refreshConfig`.

## Tela Produtos

Objetivo: visualizar produtos sincronizados por store.

Filtro obrigatorio:

```txt
Store
```

Mostrar inicialmente no maximo 10 produtos.

Colunas:

```txt
Codigo
Nome
Preco
Estoque
Codigo de barras
Atualizado em
```

Busca:

```txt
nome
codigo
codigo de barras
```

Dados sempre vem da NEO-API, nunca direto do agente.

## Tela Logs

Objetivo: substituir necessidade de olhar terminal do agente.

Eventos:

```txt
agente conectado
agente desconectado
busca iniciada
arquivo encontrado
banco selecionado
teste de conexao
mapping salvo
sync iniciado
sync finalizado
sync falhou
erro de permissao
erro de driver
```

Filtros:

```txt
store
agent
nivel
periodo
```

## Tempo Real

Conectar no Socket.IO da NEO-API para receber:

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

Comportamento esperado:

- Status do agente muda sem reload.
- Logs aparecem sem reload.
- Resultado de comando aparece sem reload.
- Produtos atualizam apos sync.

## Instalacao Pelo WEB

Ao gerar token, mostrar:

```txt
Token do agente
Comando Linux
Link do instalador Windows
Status aguardando conexao
```

Exemplo de comando:

```bash
curl -fsSL https://api.seudominio.com/pharma-connector/install.sh | sudo bash -s -- --token TOKEN
```

## Critérios De Pronto

- Rota `/integrations/pharma-connector` criada.
- Pagina segue o padrao visual das integracoes atuais.
- Admin cria store.
- Admin cria agente.
- Admin gera token.
- WEB mostra status online/offline em tempo real.
- WEB dispara busca de banco.
- WEB mostra arquivos retornados pelo agente.
- WEB salva configuracao de banco.
- WEB salva mapping.
- WEB lista produtos por `storeId`.
- WEB mostra logs sem reload manual.
