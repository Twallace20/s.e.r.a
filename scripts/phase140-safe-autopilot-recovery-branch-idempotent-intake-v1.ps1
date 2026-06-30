param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$EvidenceDir = Join-Path $RepoRoot ".sera-proof"
New-Item -ItemType Directory -Force $EvidenceDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$EvidencePath = Join-Path $EvidenceDir "phase140_runtime_recovery_snapshot_$Stamp.json"

$folders = [ordered]@{}
foreach ($name in @("13_chatgpt_downloads","01_apply_approved","06_handoff","17_needs_attention","05_blocked","08_processing","15_bridge_outbox")) {
  $path = Join-Path $AutoOpsRoot $name
  $folders[$name] = [ordered]@{
    path = $path
    exists = (Test-Path $path)
    phase139Count = if (Test-Path $path) { @(Get-ChildItem $path -File -Filter "*phase139*" -ErrorAction SilentlyContinue).Count } else { 0 }
    phase140Count = if (Test-Path $path) { @(Get-ChildItem $path -File -Filter "*phase140*" -ErrorAction SilentlyContinue).Count } else { 0 }
  }
}

$record = [ordered]@{
  ok = $true
  phase = 140
  phaseId = "phase140-safe-autopilot-recovery-branch-idempotent-intake-v1"
  repoRoot = $RepoRoot
  autoOpsRoot = $AutoOpsRoot
  branchIdempotencyRule = "switch-or-unique-branch; never fail solely on existing branch"
  staleHandoffIsolationRule = "completion must match command id, phase id, expected ZIP, and run evidence"
  duplicateGenerationRule = "BLOCKED_WITH_EVIDENCE"
  downloadRoutingSemantics = "13_chatgpt_downloads is source/capture; copy routing may leave source file visible"
  folders = $folders
  safetyGates = [ordered]@{
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
    credentialsAllowed = $false
    tokensAllowed = $false
    paidServicesAllowed = $false
    githubSettingsMutationAllowed = $false
    selfMergeAllowed = $false
    productionDeploymentAllowed = $false
  }
  createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
}

$record | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding UTF8

Write-Host "Phase 140 runtime recovery snapshot written:"
Write-Host $EvidencePath
Get-Content $EvidencePath -Raw
