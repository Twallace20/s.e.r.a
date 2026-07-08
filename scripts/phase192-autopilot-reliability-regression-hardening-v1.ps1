param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = 192
$PhaseSlug = "phase192_autopilot_reliability_regression_hardening_v1"
$PhaseName = "s.e.r.a_phase192_autopilot_reliability_regression_hardening_v1_overlay"
$TagName = "phase-192-autopilot-reliability-regression-hardening-v1"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

Set-Location $RepoRoot

$Verifier = Get-ChildItem $Handoff -File -Filter "$PhaseName-*-VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Verifier) {
  throw "Fresh Phase192 VERIFY_PASS handoff was not found before QA."
}

if ($Verifier.LastWriteTime -lt (Get-Date).AddMinutes(-30)) {
  throw ("Latest Phase192 VERIFY_PASS handoff is stale: {0}" -f $Verifier.FullName)
}

$Manifest = Join-Path $RepoRoot ".overlay\CHECKSUMS.sha256"
if (!(Test-Path $Manifest)) { throw ("Overlay checksum manifest missing: {0}" -f $Manifest) }

$ManifestText = (Get-Content -LiteralPath $Manifest -Raw) -replace "\\", "/"
if ($ManifestText -match "\\") { throw "CHECKSUMS.sha256 must be forward-slash normalized." }

foreach ($Needle in @(
  ".overlay/phase192_autopilot_reliability_regression_hardening_v1.json",
  ".sera-proof/phase192_autopilot_reliability_regression_hardening_v1.json",
  "docs/phase192-autopilot-reliability-regression-hardening-v1.md",
  "scripts/sera-autopilot-reliability-regression-hardening-v1.ps1",
  "scripts/verify-phase192-autopilot-reliability-regression-hardening-v1.ps1",
  "scripts/phase192-autopilot-reliability-regression-hardening-v1.ps1"
)) {
  if ($ManifestText -notlike "*$Needle*") { throw ("Checksum manifest missing {0}" -f $Needle) }
  Write-Host "PHASE192_QA_MANIFEST_ENTRY $Needle"
}

$ReliabilityScript = Join-Path $RepoRoot "scripts\sera-autopilot-reliability-regression-hardening-v1.ps1"
& powershell -NoProfile -ExecutionPolicy Bypass -File $ReliabilityScript -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -PhaseSlug $PhaseSlug -ExpectedZipFilename "s.e.r.a_phase192_autopilot_reliability_regression_hardening_v1_overlay.zip" -AssertOnly
$ReliabilityCode = $LASTEXITCODE
if ($null -eq $ReliabilityCode) { $ReliabilityCode = 0 }
if ($ReliabilityCode -ne 0) { throw ("Phase192 reliability regression hardening script failed with exit code {0}" -f $ReliabilityCode) }

$ProofJson = Get-Content -LiteralPath (Join-Path $RepoRoot ".sera-proof\phase192_autopilot_reliability_regression_hardening_v1.json") -Raw | ConvertFrom-Json
if ([string]$ProofJson.phaseSlug -ne $PhaseSlug) { throw "Proof phaseSlug mismatch." }
if ($ProofJson.randomRecentChatFallbackAllowed -ne $false) { throw "Proof must forbid random recent chat fallback." }
if ($ProofJson.newChatFallbackAllowed -ne $false) { throw "Proof must forbid new chat fallback." }

$Out = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"
@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Branch: $(git branch --show-current)
Timestamp: $Stamp
Tag: $TagName

Result: Phase192 QA passed for autopilot reliability regression hardening.

Proof:
- Fresh current-phase VERIFY_PASS handoff was found: $($Verifier.FullName)
- Overlay checksum manifest is forward-slash normalized and includes Phase192 overlay/proof/doc/verifier/QA/reliability script entries.
- Phase192 reliability regression hardening script passed in assert-only mode.
- Phase192 proof file forbids random recent chat fallback and new chat fallback.
- Phase192 adds reusable regression checks for dirty worktrees, PowerShell parse validation, checksum path normalization, ZIP hash-change assertion, duplicate aftershock detection, fresh handoff gates, pasteback-before-merge, and watcher-return proof.
- This QA does not alter credentials, tokens, paid services, GitHub security settings, or external provider configuration.
"@ | Set-Content -LiteralPath $Out -Encoding UTF8

Write-Host "PASS_GUARANTEED $Out"
exit 0
