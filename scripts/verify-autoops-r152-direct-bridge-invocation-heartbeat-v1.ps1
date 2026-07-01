param([string]$RepoRoot=(Get-Location).Path)
$ErrorActionPreference = "Stop"
$phase = "AutoOps R152"
$slug = "autoops_r152_direct_bridge_invocation_heartbeat_v1"
$files = @(
  ".overlay\autoops_r152_direct_bridge_invocation_heartbeat_v1.json",
  ".sera-proof\autoops_r152_direct_bridge_invocation_heartbeat_v1.json",
  "docs\autoops-r152-direct-bridge-invocation-heartbeat-v1.md",
  "scripts\autoops-r152-direct-bridge-invocation-heartbeat-v1.ps1",
  "scripts\verify-autoops-r152-direct-bridge-invocation-heartbeat-v1.ps1",
  "tests\integration\autoops-r152-direct-bridge-invocation-heartbeat-v1.test.ts"
)
$issues = @()
foreach ($f in $files) { if (!(Test-Path (Join-Path $RepoRoot $f))) { $issues += "Missing file: $f" } }
$scriptPath = Join-Path $RepoRoot "scripts\autoops-r152-direct-bridge-invocation-heartbeat-v1.ps1"
if (Test-Path $scriptPath) {
  $s = Get-Content $scriptPath -Raw
  foreach ($marker in @("direct-bridge-invocation","heartbeat","stage-timeout","phase138-artifact-watcher-safe-wrapper.ps1","SERA_CHATGPT_BRIDGE_ALLOW_EXECUTE","localhost:9222","artifact-watch-request.json","generation-lease.json","allowRandomRecentChatFallback = False","allowNewChatFallback = False","savedChatGptTargetOnly = True")) {
    if ($s -notmatch [regex]::Escape($marker)) { $issues += "Script missing marker: $marker" }
  }
  if ($s -match "Start-ScheduledTask") { $issues += "Script must not depend on Start-ScheduledTask" }
  if ($s -notmatch "DefaultExpectedZipFilename") { $issues += "Script must pass DefaultExpectedZipFilename into the bridge wrapper" }
}
[pscustomobject]@{ ok=($issues.Count -eq 0); phase=$phase; phaseSlug=$slug; repoRoot=$RepoRoot; checkedFiles=$files; issues=$issues } | ConvertTo-Json -Depth 20
if ($issues.Count -gt 0) { exit 1 }
