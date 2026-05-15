param(
  [string]$StageRoot = "$PSScriptRoot\stage",
  [string]$AppRoot = "$PSScriptRoot\stage\app",
  [string]$WinSWPath = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if (-not $WinSWPath) {
  $candidates = @(
    (Join-Path $PSScriptRoot "bin\WinSW.exe"),
    (Join-Path $PSScriptRoot "WinSW.exe"),
    (Join-Path $PSScriptRoot "WinSW-x64.exe")
  )
  $WinSWPath = ($candidates | Where-Object { Test-Path $_ } | Select-Object -First 1)
}

Push-Location $repoRoot
try {
  npm run build
}
finally {
  Pop-Location
}

if (Test-Path $StageRoot) {
  Remove-Item $StageRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $AppRoot -Force | Out-Null

Copy-Item -Path (Join-Path $repoRoot "package.json") -Destination $AppRoot -Force
Copy-Item -Path (Join-Path $repoRoot "package-lock.json") -Destination $AppRoot -Force
Copy-Item -Path (Join-Path $repoRoot "dist\*") -Destination $AppRoot -Recurse -Force

Push-Location $AppRoot
try {
  npm ci --omit=dev
}
finally {
  Pop-Location
}

$nodeCommand = Get-Command node.exe -ErrorAction Stop
Copy-Item -Path $nodeCommand.Source -Destination (Join-Path $AppRoot "node.exe") -Force

if (-not (Test-Path $WinSWPath)) {
  throw "WinSW.exe nao encontrado em '$WinSWPath'. Coloque o binario em packaging/windows/bin/WinSW.exe ou passe -WinSWPath."
}

Copy-Item -Path $WinSWPath -Destination (Join-Path $AppRoot "PharmaConnectorAgent.exe") -Force
Copy-Item -Path (Join-Path $PSScriptRoot "service\PharmaConnectorAgent.xml") -Destination (Join-Path $AppRoot "PharmaConnectorAgent.xml") -Force
Copy-Item -Path (Join-Path $PSScriptRoot "config\config.local.json.template") -Destination (Join-Path $AppRoot "config.local.json.template") -Force
Copy-Item -Path (Join-Path $PSScriptRoot "config\.env.template") -Destination (Join-Path $AppRoot ".env.template") -Force

Write-Host "Windows stage pronto em $AppRoot"
