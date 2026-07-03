param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase172_upload_json_only_auto_loop_router_v1_overlay",
  [string]$Branch = "work/phase-172-upload-json-only-auto-loop-router-v1",
  [string]$Verifier = "scripts\verify-phase172-upload-json-only-auto-loop-router-v1.ps1"
)
$ErrorActionPreference = "Stop"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
New-Item -ItemType Directory -Force $Handoff,$MergePending | Out-Null
$VerifierPath = Join-Path $RepoRoot $Verifier
if (!(Test-Path $VerifierPath)) { throw "Verifier missing: $VerifierPath" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $VerifierPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
if ($LASTEXITCODE -ne 0) { throw "Verifier failed." }
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"
@(
  "# S.E.R.A. AutoOps Packet",
  "",
  "Status: PASS_GUARANTEED",
  "Phase: $PhaseName",
  "Branch: $Branch",
  "Timestamp: $Stamp",
  "",
  "## Summary",
  "",
  "Phase172 full auto JSON loop router, ChatGPT browser bridge, and direct no-VBS ZIP closeout scripts passed verification.",
  "",
  "## Safety",
  "",
  "No credentials, tokens, paid services, dependency installs, security setting changes, scheduled task enablement, startup persistence, or uncontrolled browser automation were added."
) | Set-Content $PassPath -Encoding UTF8
$PendingPath = Join-Path $MergePending "$PhaseName-$Stamp-MERGE_PENDING.json"
@{
  phase = $PhaseName
  branch = $Branch
  status = "MERGE_PENDING"
  passGuaranteed = $PassPath
  createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 5 | Set-Content $PendingPath -Encoding UTF8
Write-Host "PASS_GUARANTEED: $PassPath"
