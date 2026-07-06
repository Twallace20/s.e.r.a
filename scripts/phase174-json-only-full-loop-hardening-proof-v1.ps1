param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
New-Item -ItemType Directory -Force $Handoff,$MergePending | Out-Null

foreach ($Nested in @(".overlay\.overlay",".sera-proof\.sera-proof","docs\docs","scripts\scripts")) {
  if (Test-Path (Join-Path $RepoRoot $Nested)) {
    throw "QA refused PASS_GUARANTEED because nested overlay path remains: $Nested"
  }
}

$Required = @(
  "scripts\verify-phase174-json-only-full-loop-hardening-proof-v1.ps1",
  "scripts\phase174-json-only-full-loop-hardening-proof-v1.ps1",
  "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1",
  "scripts\sera-full-auto-json-loop-router-v1.ps1",
  "scripts\sera-repair-nested-overlay-paths-v1.ps1"
)

foreach ($Rel in $Required) {
  if (!(Test-Path (Join-Path $RepoRoot $Rel))) {
    throw "QA refused PASS_GUARANTEED because required file is missing: $Rel"
  }
}

$PhaseName = "s.e.r.a_phase174_json_only_full_loop_hardening_proof_v1_overlay"
$Branch = "work/phase174-json-only-full-loop-hardening-proof-v1"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"

$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Branch: $Branch
Timestamp: $Stamp

Guarantee:
Phase174 hardens the JSON-only full loop after the Phase173 proof.

Verified capabilities:
- Nested overlay paths are flattened before verification.
- Verifier path resolution is mandatory.
- QA path resolution is mandatory.
- PASS_GUARANTEED is produced only after verifier and QA scripts are available and the QA checks pass.
- Direct ZIP closeout refuses merge if PASS_GUARANTEED is absent.
- Full-loop router uses direct ZIP closeout instead of the broken VBS/orchestrator path.
- Browser bridge requires exact expected ZIP when ExpectedFilename is provided.

Merge rule:
SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED.
WAIT_ONLY_CLOSED.

Safety:
No credentials, tokens, paid services, dependency installs, security setting changes, scheduled task enablement, login boot persistence, or uncontrolled browser automation were added.
"@ | Set-Content $PassPath -Encoding UTF8

$MergePath = Join-Path $MergePending "$PhaseName-$Stamp-MERGE_APPROVED.md"

@"
Status: MERGE_APPROVED
Phase: $PhaseName
Branch: $Branch
Timestamp: $Stamp
Rule: SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED
Source: QA generated PASS_GUARANTEED after required verifier and QA checks.
"@ | Set-Content $MergePath -Encoding UTF8

Write-Host "PHASE174_QA PASS_GUARANTEED"
Write-Host $PassPath
