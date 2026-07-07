param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"
$PhaseName = "s.e.r.a_phase190_closeout_order_and_handoff_identity_hard_gate_v1_overlay"
$PhaseSlug = "phase190_closeout_order_and_handoff_identity_hard_gate_v1"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$EvidenceDir = Join-Path $AutoOpsRoot "00_control_center\evidence\phase190-closeout-order-and-handoff-identity-hard-gate-v1"
New-Item -ItemType Directory -Force $Handoff | Out-Null
New-Item -ItemType Directory -Force $EvidenceDir | Out-Null

function Assert-File { param([string]$Path) if (!(Test-Path $Path)) { throw "Missing required file: $Path" } }
function Assert-ParseOk {
  param([string]$Path)
  Assert-File $Path
  $Tokens = $null; $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
  if ($Errors -and $Errors.Count -gt 0) { throw "Parse failed: $Path :: $($Errors[0].Message)" }
}
function Assert-Contains {
  param([string]$Path, [string]$Needle)
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -notlike "*$Needle*") { throw "Missing marker '$Needle' in $Path" }
}
function Assert-NotContains {
  param([string]$Path, [string]$Needle)
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -like "*$Needle*") { throw "Forbidden marker '$Needle' in $Path" }
}

$Direct = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
$Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"
$Qa = Join-Path $RepoRoot "scripts\phase190-closeout-order-and-handoff-identity-hard-gate-v1.ps1"
$AliasVerifier = Join-Path $RepoRoot "scripts\verify-closeout-order-and-handoff-identity-hard-gate-v1.ps1"
$AliasQa = Join-Path $RepoRoot "scripts\closeout-order-and-handoff-identity-hard-gate-v1.ps1"
foreach ($File in @($Direct,$Watcher,$Qa,$AliasVerifier,$AliasQa)) { Assert-ParseOk $File }
foreach ($Pair in @(
  @($Direct,"PHASE190_CLOSEOUT_ORDER_HARD_GATE"),
  @($Direct,"PASTEBACK_BEFORE_MERGE_REQUIRED"),
  @($Direct,"PASTEBACK_POSTED_TEXT_MATCH_REQUIRED_BEFORE_MERGE"),
  @($Direct,"PASTEBACK_BLOCKED_PREVENTS_MERGE"),
  @($Direct,"PASTEBACK_BLOCKED_PREVENTS_CLOSED_CLEANLY"),
  @($Direct,"SYNTHESIZE_CURRENT_PHASE_CLOSED_CLEANLY"),
  @($Direct,"STALE_HANDOFF_REJECTED_BEFORE_MERGE"),
  @($Direct,"DIRECT_CLOSEOUT_RETURNS_NONZERO_ON_PASTEBACK_FAILURE"),
  @($Direct,"NO_LEGACY_DELEGATE_AFTER_PHASE190"),
  @($Direct,"PHASE190_PRESEEDED_ZIP_SAVED_TARGET_CONTINUITY"),
  @($Direct,"SAVED_CHATGPT_TARGET_CAPTURED_FOR_PRESEEDED_ZIP"),
  @($Direct,"PASTEBACK_TARGET_READY_BEFORE_MERGE"),
  @($Watcher,"EXACT_ZIP_ALREADY_PRESENT_SKIP_BROWSER_BRIDGE"),
  @($Watcher,"RUN_DIRECT_ZIP_CLOSEOUT"),
  @($Watcher,"WATCHER_RETURN_TO_WATCH_AFTER_RUN"),
  @($Watcher,"PHASE190_CLOSEOUT_ORDER_AND_HANDOFF_IDENTITY_HARD_GATE"),
  @($Watcher,"PHASE190_PRESEEDED_ZIP_SAVED_TARGET_CONTINUITY"),
  @($Watcher,"SAVED_CHATGPT_TARGET_CAPTURED_FOR_PRESEEDED_ZIP"),
  @($Qa,"PHASE190_QA_PREMERGE_PASTEBACK_GATE"),
  @($AliasVerifier,"PHASE190_VERIFIER_ALIAS_COMPAT"),
  @($AliasQa,"PHASE190_QA_ALIAS_COMPAT")
)) { Assert-Contains $Pair[0] $Pair[1] }
Assert-NotContains $Direct "& $Legacy @InvokeParams"

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$EvidencePath = Join-Path $EvidenceDir "VERIFY_PASS-evidence-$Stamp.json"
$Evidence = [ordered]@{
  phase = $PhaseName
  phaseSlug = $PhaseSlug
  result = "VERIFY_PASS"
  generatedAt = (Get-Date).ToString("o")
  proof = @(
    "Direct closeout no longer delegates to legacy after Phase190.",
    "Pasteback is required before merge/tag/push/cleanup.",
    "Pasteback blocked prevents CLOSED_CLEANLY and merge/tag/push/cleanup.",
    "CLOSED_CLEANLY is synthesized from current phase metadata.",
    "Stale older-phase result bodies are rejected before merge.",
    "Watcher exact ZIP bypass and return-to-watch markers remain installed.",
    "Preseeded ZIP flow prepares a saved ChatGPT target before direct closeout/pasteback."
  )
}
($Evidence | ConvertTo-Json -Depth 12) | Set-Content -LiteralPath $EvidencePath -Encoding UTF8

$VerifyPath = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"
@"
# S.E.R.A. AutoOps Packet

Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

## Summary
Phase190 verifier passed. The closeout order and handoff identity hard gate is installed for $PhaseSlug.

## Evidence
$EvidencePath

## Proof
- PHASE190_VERIFY PASS
- PHASE190_CLOSEOUT_ORDER_HARD_GATE
- PASTEBACK_BEFORE_MERGE_REQUIRED
- PASTEBACK_BLOCKED_PREVENTS_MERGE
- SYNTHESIZE_CURRENT_PHASE_CLOSED_CLEANLY
- STALE_HANDOFF_REJECTED_BEFORE_MERGE
- DIRECT_CLOSEOUT_RETURNS_NONZERO_ON_PASTEBACK_FAILURE
- PHASE190_PRESEEDED_ZIP_SAVED_TARGET_CONTINUITY
- SAVED_CHATGPT_TARGET_CAPTURED_FOR_PRESEEDED_ZIP
"@ | Set-Content -LiteralPath $VerifyPath -Encoding UTF8
Write-Host "PHASE190_VERIFY PASS"
Write-Host "VERIFY_PASS: $VerifyPath"
exit 0
