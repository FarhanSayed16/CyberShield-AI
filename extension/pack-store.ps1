# Pack CyberSentinel extension zip for Chrome Web Store / enterprise share.
# Usage (from repo root):  pwsh extension/pack-store.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $root 'dist'
$zip = Join-Path $outDir 'cybersentinel-extension.zip'

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
if (Test-Path $zip) { Remove-Item $zip -Force }

$include = @(
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'ai-content.js',
  'popup.html',
  'popup.js',
  'INSTALL.md',
  'icons',
  'utils',
  'engine',
  'lineage',
  'ui'
)

$stage = Join-Path $outDir '_stage'
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

foreach ($item in $include) {
  $src = Join-Path $root $item
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination $stage -Recurse -Force
  }
}

Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force
Write-Host "Created $zip"
