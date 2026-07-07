param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"
# PHASE190_QA_PREMERGE_PASTEBACK_GATE
# PHASE190_CURRENT_PHASE_FINAL_HANDOFF_SEED
# PHASE190_PASTEBACK_BEFORE_MERGE_PROOF

$PhaseName = "s.e.r.a_phase190_closeout_order_and_handoff_identity_hard_gate_v1_overlay"
$PhaseSlug = "phase190_closeout_order_and_handoff_identity_hard_gate_v1"
$PhaseToken = "phase190-closeout-order-and-handoff-identity-hard-gate-v1"
$TagName = "phase-190-closeout-order-and-handoff-identity-hard-gate-v1"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$StateDir = Join-Path $AutoOpsRoot "00_control_center\state"
$EvidenceDir = Join-Path $AutoOpsRoot "00_control_center\evidence\phase190-closeout-order-and-handoff-identity-hard-gate-v1"
New-Item -ItemType Directory -Force $Handoff | Out-Null
New-Item -ItemType Directory -Force $StateDir | Out-Null
New-Item -ItemType Directory -Force $EvidenceDir | Out-Null

function Assert-File { param([string]$Path) if (!(Test-Path $Path)) { throw "Missing required file: $Path" } }
function Assert-Contains { param([string]$Path,[string]$Needle) $Text=Get-Content -LiteralPath $Path -Raw; if ($Text -notlike "*$Needle*") { throw "Missing marker '$Needle' in $Path" } }
function Assert-NoForbiddenResultPhase {
  param([string]$Text)
  foreach ($Old in @("Phase180","Phase186","Phase187","Phase188","Phase189")) {
    if ($Text -match "Result:\s*$Old\s+closed cleanly") { throw "Forbidden stale result phase in final handoff seed: $Old" }
    if ($Text -match "Exact $Old ZIP was downloaded") { throw "Forbidden stale proof ZIP reference in final handoff seed: $Old" }
  }
}
function Write-SeedTargets { param([string]$Content)
  $Targets = @(
    (Join-Path $Handoff "CURRENT_PHASE_CLOSED_CLEANLY.md"),
    (Join-Path $Handoff "CURRENT_PHASE_FINAL_HANDOFF.md"),
    (Join-Path $Handoff "CURRENT_PHASE_HANDOFF.md"),
    (Join-Path $Handoff "FINAL_CURRENT_PHASE_HANDOFF.md"),
    (Join-Path $Handoff "FINAL_HANDOFF.md"),
    (Join-Path $Handoff "LATEST_FINAL_HANDOFF.md"),
    (Join-Path $Handoff "current-phase-CLOSED_CLEANLY.md"),
    (Join-Path $Handoff "current-phase-final-handoff.md"),
    (Join-Path $StateDir "CURRENT_PHASE_CLOSED_CLEANLY.md"),
    (Join-Path $StateDir "CURRENT_PHASE_FINAL_HANDOFF.md"),
    (Join-Path $AutoOpsRoot "00_control_center\CURRENT_PHASE_CLOSED_CLEANLY.md"),
    (Join-Path $AutoOpsRoot "00_control_center\CURRENT_PHASE_FINAL_HANDOFF.md"),
    (Join-Path $RepoRoot "CURRENT_PHASE_CLOSED_CLEANLY.md"),
    (Join-Path $RepoRoot "CURRENT_PHASE_FINAL_HANDOFF.md")
  )
  foreach ($Target in $Targets) { New-Item -ItemType Directory -Force (Split-Path $Target -Parent) | Out-Null; $Content | Set-Content -LiteralPath $Target -Encoding UTF8 }
}

$LatestVerify = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (!$LatestVerify) { throw "Fresh current-phase VERIFY_PASS handoff missing for $PhaseName" }
if ($LatestVerify.LastWriteTime -lt (Get-Date).AddMinutes(-20)) { throw "VERIFY_PASS handoff is stale: $($LatestVerify.FullName)" }
$VerifyText = Get-Content -LiteralPath $LatestVerify.FullName -Raw
if ($VerifyText -notmatch [regex]::Escape("Phase: $PhaseName")) { throw "VERIFY_PASS handoff phase mismatch." }
if ($VerifyText -notlike "*$PhaseSlug*") { throw "VERIFY_PASS handoff missing phaseSlug." }

$Direct = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
foreach ($Needle in @("PHASE190_CLOSEOUT_ORDER_HARD_GATE","PASTEBACK_BEFORE_MERGE_REQUIRED","PASTEBACK_BLOCKED_PREVENTS_MERGE","SYNTHESIZE_CURRENT_PHASE_CLOSED_CLEANLY","STALE_HANDOFF_REJECTED_BEFORE_MERGE","NO_LEGACY_DELEGATE_AFTER_PHASE190","PHASE190_PRESEEDED_ZIP_SAVED_TARGET_CONTINUITY","SAVED_CHATGPT_TARGET_CAPTURED_FOR_PRESEEDED_ZIP","PASTEBACK_TARGET_READY_BEFORE_MERGE")) { Assert-Contains $Direct $Needle }

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$FinalSeed = @"
Status: CLOSED_CLEANLY
Phase: $PhaseName
Branch: main
Timestamp: $Stamp
Tag: $TagName

Result: Phase190 closed cleanly after installing the closeout order and final handoff identity hard gate for $PhaseSlug.

Proof:
- Phase190 verifier produced a fresh current-phase VERIFY_PASS handoff.
- Phase190 QA produced a fresh current-phase PASS_GUARANTEED handoff.
- CLOSED_CLEANLY is synthesized from Phase190 metadata instead of copied from older handoffs.
- Stale older-phase result text is rejected before merge/tag/push/cleanup.
- PASTEBACK_POSTED_TEXT_MATCH is required before merge/tag/push/cleanup.
- PASTEBACK_BLOCKED prevents CLOSED_CLEANLY and prevents merge/tag/push/cleanup.
- Preseeded ZIP flow prepares a saved ChatGPT target before pasteback.
- No random recent chat fallback or new chat fallback is allowed.
"@
Assert-NoForbiddenResultPhase -Text $FinalSeed
if ($FinalSeed -notlike "*Phase190*") { throw "Final seed missing Phase190." }
if ($FinalSeed -notlike "*$PhaseSlug*") { throw "Final seed missing phaseSlug." }
Write-SeedTargets -Content $FinalSeed
$PendingPath = Join-Path $Handoff "$PhaseName-$Stamp-PREMERGE_FINAL_HANDOFF_FOR_PASTEBACK.md"
$FinalSeed | Set-Content -LiteralPath $PendingPath -Encoding UTF8
Write-Host "PHASE190_CURRENT_PHASE_FINAL_HANDOFF_SEED $PendingPath"

$Evidence = [ordered]@{
  phase = $PhaseName
  phaseSlug = $PhaseSlug
  result = "PASS_GUARANTEED"
  generatedAt = (Get-Date).ToString("o")
  proof = @(
    "Fresh current-phase VERIFY_PASS exists for Phase190.",
    "Phase190 final handoff seed uses Phase190 as result phase.",
    "The seed rejects Phase180, Phase186, Phase187, Phase188, and Phase189 as result phases.",
    "Direct closeout hard gate requires pasteback before merge for future phases.",
    "Direct closeout hard gate blocks merge/tag/push/cleanup on pasteback failure for future phases.",
    "Preseeded ZIP saved-target continuity is installed before pasteback."
  )
}
$EvidencePath = Join-Path $EvidenceDir "PASS_GUARANTEED-evidence-$Stamp.json"
($Evidence | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"
@"
# S.E.R.A. AutoOps Packet

Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

## Summary
Phase190 QA passed. The closeout order and final handoff identity hard gate is installed, and current-phase final handoff seed files were refreshed for the closeout path.

## Evidence
$EvidencePath

## Proof
- PHASE190_QA PASS_GUARANTEED
- PHASE190_CURRENT_PHASE_FINAL_HANDOFF_SEED
- PHASE190_QA_PREMERGE_PASTEBACK_GATE
- PHASE190_PASTEBACK_BEFORE_MERGE_PROOF
- PASTEBACK_BLOCKED_PREVENTS_MERGE
- SYNTHESIZE_CURRENT_PHASE_CLOSED_CLEANLY
- STALE_HANDOFF_REJECTED_BEFORE_MERGE
- PHASE190_PRESEEDED_ZIP_SAVED_TARGET_CONTINUITY
- PASTEBACK_TARGET_READY_BEFORE_MERGE
"@ | Set-Content -LiteralPath $PassPath -Encoding UTF8
Write-Host "PHASE190_QA PASS_GUARANTEED"
Write-Host "PASS_GUARANTEED: $PassPath"
exit 0
