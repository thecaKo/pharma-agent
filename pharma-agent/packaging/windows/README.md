# Windows Packaging Base

Base de instalacao para o agente no Windows usando:

- Instalador visual: Inno Setup
- Servico Windows: WinSW
- Backend: Node.js
- Configuracao: JSON e `.env`
- Interface do instalador: wizard customizado

## Objetivo

- instalar os arquivos do agente em `Program Files`
- gravar a configuracao em `Program Files` ou `ProgramData`, conforme o pacote final
- registrar o agente como servico Windows
- abrir o setup local na primeira execucao

## Estrutura

- `inno/pharma-agent.iss`: instalador visual com wizard customizado
- `service/PharmaConnectorAgent.xml`: configuracao do WinSW
- `config/config.local.json.template`: modelo da configuracao local
- `config/.env.template`: modelo do ambiente
- `build.ps1`: prepara o stage do pacote Windows
- `install.ps1`: bootstrap manual para testes
- `bin/WinSW.exe`: wrapper do servico a distribuir no pacote final

## Caminho padrao da configuracao

O agente usa os dois arquivos:

- `config.local.json` para dados estruturados
- `.env` para variaveis de ambiente

No Windows, a base aponta para:

`%ProgramFiles%\PharmaConnectorAgent`

## Passos seguintes

1. baixar `WinSW.exe` e colocar em `packaging/windows/bin/WinSW.exe`
2. usar `prepare-transfer.sh` no Linux para montar o pacote de transferencia
3. no Windows, executar `windows-build.ps1` para montar o stage
4. compilar `inno/pharma-agent.iss` no Inno Setup

Para preparar o stage:

```bash
npm run prepare:windows
```

No PC Windows, rode:

```powershell
powershell -ExecutionPolicy Bypass -File packaging/windows/windows-build.ps1
```
