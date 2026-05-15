# PharmaTunnel Agent

Agente local Node.js/TypeScript para conectar o painel PharmaConnector ao banco local do cliente.

## Rodar em desenvolvimento

```bash
npm install
npm run dev
```

Na primeira execucao, acesse:

```text
http://localhost:3333/setup
```

Configure nome do agente e token. Para gerar um token, use o botao `Gerar Token` no setup local.

O agente usa um painel unico. Em desenvolvimento, a URL padrao e:

```text
http://localhost:3000
```

Para apontar para outro ambiente, defina:

```bash
PHARMA_PANEL_URL=https://painel.exemplo.com npm run dev
```

O agente salva a configuracao em `config.local.json`, registra no painel e abre o WebSocket persistente.

## Comandos suportados

- `db:test`
- `db:schema`
- `db:columns`
- `products:import`

MySQL usa `mysql2/promise`. Firebird usa `node-firebird`.

## Windows

Existe uma base de instalacao em `packaging/windows/` seguindo este padrao:

- Instalador visual: Inno Setup
- Servico Windows: WinSW
- Backend: Node.js
- Configuracao: JSON e `.env`
- Interface do instalador: wizard customizado

Para montar o stage do pacote Windows:

```bash
npm run prepare:windows
```

Depois de copiar a pasta gerada para um PC com Windows, execute:

```powershell
powershell -ExecutionPolicy Bypass -File packaging/windows/windows-build.ps1
```
