[CmdletBinding()]
param(
  [ValidateSet('x64', 'arm64')]
  [string]$Architecture = 'x64',
  [switch]$SkipInstall,
  [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

function Invoke-NativeStep {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  Write-Host "`n==> $Name" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

Write-Host "Building TodoPlan for Windows ($Architecture)" -ForegroundColor Green

$outputDirectory = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'out\windows'))
$unpackedName = if ($Architecture -eq 'x64') { 'win-unpacked' } else { "win-$Architecture-unpacked" }
foreach ($name in @($unpackedName, "$unpackedName.tmp")) {
  $stagingDirectory = [System.IO.Path]::GetFullPath((Join-Path $outputDirectory $name))
  if (-not $stagingDirectory.StartsWith("$outputDirectory$([System.IO.Path]::DirectorySeparatorChar)")) {
    throw "Unexpected staging directory: $stagingDirectory"
  }
  if (Test-Path -LiteralPath $stagingDirectory) {
    Write-Host "==> Cleaning previous builder staging directory: $name" -ForegroundColor Cyan
    Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
  }
}

if (-not $SkipInstall) {
  Invoke-NativeStep -Name 'Installing locked dependencies' -Command { npm ci }
}

if (-not $SkipTests) {
  Invoke-NativeStep -Name 'Running tests' -Command { npm test }
}

Invoke-NativeStep -Name 'Building application' -Command { npm run build }
Invoke-NativeStep -Name 'Creating Windows packages' -Command {
  npm exec electron-builder -- --win "--$Architecture" --publish never --config.directories.output=out/windows --config.electronDist=node_modules/electron/dist
}

Write-Host "`nDone. Windows packages are in: $projectRoot\out\windows" -ForegroundColor Green
