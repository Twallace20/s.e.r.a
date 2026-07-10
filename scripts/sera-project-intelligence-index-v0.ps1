[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutPath = ""
)
$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($OutPath)) {
  $OutDir = Join-Path $RepoRoot ".sera-index"
  New-Item -ItemType Directory -Force $OutDir | Out-Null
  $OutPath = Join-Path $OutDir "project-intelligence-v0.json"
}
$Files = Get-ChildItem -LiteralPath $RepoRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\.git\\|node_modules\\|\\.next\\|dist\\|build\\|coverage\\' } |
  ForEach-Object {
    $Rel = $_.FullName.Substring($RepoRoot.Length).TrimStart('\\','/') -replace '\\','/'
    [pscustomobject]@{ path = $Rel; bytes = $_.Length; extension = $_.Extension; lastWriteTime = $_.LastWriteTimeUtc.ToString('o') }
  }
$Index = [ordered]@{
  schemaVersion = "sera-project-intelligence-index-v0"
  generatedAt = (Get-Date).ToString("o")
  repoRoot = $RepoRoot
  fileCount = @($Files).Count
  files = @($Files)
  note = "Phase201 bootstrap only. Full Project Intelligence Engine begins in Phase202."
}
$Index | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutPath -Encoding UTF8
Write-Host "PROJECT_INTELLIGENCE_INDEX_V0_WRITTEN path=$OutPath files=$(@($Files).Count)"
