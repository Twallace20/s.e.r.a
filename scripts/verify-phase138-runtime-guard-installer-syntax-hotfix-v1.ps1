param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'

$required = @(
  'scripts/phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1',
  '.overlay/phase138_runtime_guard_installer_syntax_hotfix_v1.json',
  '.sera-proof/phase138_runtime_guard_installer_syntax_hotfix_v1.json',
  'docs/phase138-runtime-guard-installer-syntax-hotfix-v1.md',
  'scripts/verify-phase138-runtime-guard-installer-syntax-hotfix-v1.ps1'
)

$issues = New-Object System.Collections.Generic.List[string]
foreach ($relative in $required) {
  $path = Join-Path $RepoRoot $relative
  if (!(Test-Path $path)) { $issues.Add("Missing required file: $relative") }
}

$runtimeScript = Join-Path $RepoRoot 'scripts/phase138-artifact-watcher-generation-lease-expected-zip-fallback-v1.ps1'
if (Test-Path $runtimeScript) {
  $content = Get-Content $runtimeScript -Raw
  $badPatterns = @(
    '= if (',
    '(if ($DoApply)',
    'status = if',
    'Decision (if',
    'activeLease = if'
  )
  foreach ($pattern in $badPatterns) {
    if ($content.Contains($pattern)) { $issues.Add("Runtime script still contains inline-if pattern: $pattern") }
  }
  foreach ($needle in @('generation lease','expected ZIP','saved ChatGPT target','allowNewChatFallback','allowRandomRecentChatFallback')) {
    if ($content -notmatch [regex]::Escape($needle)) { $issues.Add("Runtime script missing expected guard language: $needle") }
  }
}

$result = [pscustomobject]@{
  ok = ($issues.Count -eq 0)
  phase = 138
  hotfix = 'runtime-guard-installer-syntax-hotfix-v1'
  repoRoot = $RepoRoot
  checkedFiles = $required
  issues = @($issues)
}

$result | ConvertTo-Json -Depth 10
if (!$result.ok) { exit 1 }
