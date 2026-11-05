$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Ext = Join-Path $Root "extension"
$Dist = Join-Path $Root "dist"
New-Item -ItemType Directory -Force -Path $Dist | Out-Null
$manifest = Get-Content (Join-Path $Ext "manifest.json") -Raw | ConvertFrom-Json
$zip = Join-Path $Dist "cybersentinel-extension-$($manifest.version).zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $Ext "*") -DestinationPath $zip
Write-Host $zip
