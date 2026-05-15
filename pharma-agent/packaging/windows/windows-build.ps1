param(
  [string]$WinSWPath = "$PSScriptRoot\bin\WinSW.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $WinSWPath)) {
  throw "WinSW.exe nao encontrado em '$WinSWPath'."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Push-Location $repoRoot
try {
  npm ci --omit=dev
  npm run build
  .\packaging\windows\build.ps1 -WinSWPath $WinSWPath
}
finally {
  Pop-Location
}
