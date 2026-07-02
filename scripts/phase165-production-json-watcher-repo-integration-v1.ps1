param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase165_production_json_watcher_repo_integration_v1_overlay",
  [string]$Branch = "work/phase165-production-json-watcher-repo-integration-v1",
  [string]$Verifier = "scripts\verify-phase165-production-json-watcher-repo-integration-v1.ps1",
  [string]$PassHandoffPath = "",
  [string]$MergePendingPath = ""
)

$ErrorActionPreference = "Stop"

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Control = Join-Path $AutoOpsRoot "00_control_center"
$EvidenceRoot = Join-Path $Control "evidence\phase165-production-json-watcher-repo-integration-v1"

New-Item -ItemType Directory -Force $Handoff,$Control,$EvidenceRoot | Out-Null

Set-Location $RepoRoot

$VerifierPath = Join-Path $RepoRoot $Verifier
if (!(Test-Path $VerifierPath)) {
  throw "Verifier missing: $VerifierPath"
}

$VerifyOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $VerifierPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1
$VerifyExit = $LASTEXITCODE
$VerifyText = ($VerifyOutput | Out-String)

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"

if ($VerifyExit -ne 0) {
  $Blocked = Join-Path $Handoff "$PhaseName-$Stamp-QA_BLOCKED.md"
  @(
    "# S.E.R.A. AutoOps Packet",
    "",
    "Status: QA_BLOCKED",
    "Phase: $PhaseName",
    "Branch: $Branch",
    "",
    "## Summary",
    "Phase165 verifier failed.",
    "",
    "## Evidence",
    $VerifyText
  ) -join "`r`n" | Set-Content $Blocked -Encoding UTF8

  Get-Content $Blocked -Raw | Set-Content (Join-Path $Control "CURRENT_CHATGPT_HANDOFF.md") -Encoding UTF8
  exit 1
}

$EvidencePath = Join-Path $EvidenceRoot "PASS_GUARANTEED-evidence-$Stamp.json"

[ordered]@{
  status = "PASS_GUARANTEED"
  phase = $PhaseName
  branch = $Branch
  verifier = $VerifierPath
  passHandoffPath = $PassHandoffPath
  mergePendingPath = $MergePendingPath
  verifierOutput = $VerifyText
  createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 8 | Set-Content $EvidencePath -Encoding UTF8

$Guaranteed = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@(
  "# S.E.R.A. AutoOps Packet",
  "",
  "Status: PASS_GUARANTEED",
  "Phase: $PhaseName",
  "Branch: $Branch",
  "",
  "## Summary",
  "Phase165 verifier passed. Production JSON watcher repo integration is safe for QA-approved auto-closeout.",
  "",
  "## Evidence",
  $EvidencePath,
  "",
  "## Verifier Output",
  $VerifyText
) -join "`r`n" | Set-Content $Guaranteed -Encoding UTF8

Get-Content $Guaranteed -Raw | Set-Content (Join-Path $Control "CURRENT_CHATGPT_HANDOFF.md") -Encoding UTF8
Get-Content $Guaranteed -Raw | Set-Content (Join-Path $Control "CURRENT_CHATGPT_HANDOFF.prompt.md") -Encoding UTF8

Write-Host "PASS_GUARANTEED: $Guaranteed"
exit 0
