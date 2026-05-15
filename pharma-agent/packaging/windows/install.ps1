param(
  [Parameter(Mandatory = $true)]
  [string]$Token,

  [Parameter(Mandatory = $true)]
  [string]$ApiUrl,

  [string]$AgentName = "PharmaConnector Agent",

  [int]$SyncIntervalSeconds = 15,

  [string]$InstallRoot = "$env:ProgramFiles\PharmaConnectorAgent",

  [string]$ConfigDir = "$env:ProgramData\PharmaConnectorAgent",

  [string]$ServiceName = "PharmaConnectorAgent",

  [string]$SetupHost = "127.0.0.1",

  [int]$SetupPort = 3333
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $InstallRoot)) {
  New-Item -ItemType Directory -Path $InstallRoot | Out-Null
}

if (-not (Test-Path $ConfigDir)) {
  New-Item -ItemType Directory -Path $ConfigDir | Out-Null
}

$configPath = Join-Path $ConfigDir "config.local.json"
$config = [ordered]@{
  token = $Token
  agentName = $AgentName
  apiUrl = $ApiUrl
  syncIntervalSeconds = $SyncIntervalSeconds
  logLevel = "info"
}

$config | ConvertTo-Json -Depth 8 | Set-Content -Path $configPath -Encoding UTF8

$envPath = Join-Path $ConfigDir ".env"
$envContent = @(
  "PHARMA_AGENT_TOKEN=$Token"
  "PHARMA_API_URL=$ApiUrl"
  "PHARMA_SYNC_INTERVAL_SECONDS=$SyncIntervalSeconds"
  "PHARMA_AGENT_NAME=$AgentName"
) -join "`r`n"
$envContent | Set-Content -Path $envPath -Encoding UTF8

$nodeCommand = Get-Command node.exe -ErrorAction Stop
$nodePath = $nodeCommand.Source

$templatePath = Join-Path $PSScriptRoot "service\pharma-connector-agent.xml"
if (Test-Path $templatePath) {
  $serviceXml = Get-Content $templatePath -Raw
  $serviceXml = $serviceXml.Replace("__SERVICE_ID__", $ServiceName)
  $serviceXml = $serviceXml.Replace("__SERVICE_NAME__", $AgentName)
  $serviceXml = $serviceXml.Replace("__INSTALL_ROOT__", $InstallRoot)
  $serviceXml = $serviceXml.Replace("__NODE_EXE__", $nodePath)
  $serviceXml = $serviceXml.Replace("__AGENT_MAIN__", (Join-Path $InstallRoot "dist\index.js"))
  $serviceXml = $serviceXml.Replace("__CONFIG_PATH__", $configPath)
  $serviceXml = $serviceXml.Replace("__ENV_FILE__", $envPath)
  $serviceXml = $serviceXml.Replace("__SETUP_HOST__", $SetupHost)
  $serviceXml = $serviceXml.Replace("__SETUP_PORT__", $SetupPort.ToString())

  $serviceXmlPath = Join-Path $InstallRoot "pharma-connector-agent.xml"
  $serviceXml | Set-Content -Path $serviceXmlPath -Encoding ASCII
}

Write-Host "Configuracao gravada em $configPath"
Write-Host "Base de servico preparada em $InstallRoot"
Write-Host "Node encontrado em $nodePath"
Write-Host "Proximo passo: registrar o servico com WinSW usando o arquivo XML gerado."
