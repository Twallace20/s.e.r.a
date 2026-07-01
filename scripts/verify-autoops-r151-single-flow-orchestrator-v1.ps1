param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = "Stop"
$slug = "autoops_r151_single_flow_orchestrator_v1"
$files = @(
  ".overlay\$slug.json",
  ".sera-proof\$slug.json",
  "docs\autoops-r151-single-flow-orchestrator-v1.md",
  "scripts\autoops-r151-single-flow-orchestrator-v1.ps1",
  "scripts\verify-autoops-r151-single-flow-orchestrator-v1.ps1",
  "tests\integration\autoops-r151-single-flow-orchestrator-v1.test.ts"
)
$issues = @()
foreach ($f in $files) { if (!(Test-Path (Join-Path $RepoRoot $f))) { $issues += "Missing required file: $f" } }
$scriptPath = Join-Path $RepoRoot "scripts\autoops-r151-single-flow-orchestrator-v1.ps1"
if (Test-Path $scriptPath) {
  $s = Get-Content $scriptPath -Raw
  foreach ($marker in @("single-flow-orchestrator", "SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE", "localhost:9222", "artifact-watch-request.json", "generation-lease.json", "Write-BlockedHandoff", "Wait-ForZipAndRoute", "Start-DirectAutoOpsRunner", "allowRandomRecentChatFallback = False", "allowNewChatFallback = False")) {
    if ($s -notmatch [regex]::Escape($marker)) { $issues += "Script missing required marker: $marker" }
  }
  if ($s -match "Start-ScheduledTask") { $issues += "Script must not depend on Start-ScheduledTask" }
}
$result = [ordered]@{ ok=($issues.Count -eq 0); phase="AutoOps R151"; phaseSlug=$slug; repoRoot=$RepoRoot; checkedFiles=$files; issues=$issues }
$result | ConvertTo-Json -Depth 10
if ($issues.Count -gt 0) { exit 1 }
