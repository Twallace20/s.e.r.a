param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase = 191
$PhaseSlug = "phase191_full_autopilot_from_beginning_proof_v1"
$PhaseName = "s.e.r.a_phase191_full_autopilot_from_beginning_proof_v1_overlay"
$TagName = "phase-191-full-autopilot-from-beginning-proof-v1"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

Set-Location $RepoRoot

$Verifier = Get-ChildItem $Handoff -File -Filter "$PhaseName-*-VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$Verifier) {
  throw "Fresh Phase191 VERIFY_PASS handoff was not found before QA."
}

if ($Verifier.LastWriteTime -lt (Get-Date).AddMinutes(-30)) {
  throw "Latest Phase191 VERIFY_PASS handoff is stale: $($Verifier.FullName)"
}

$Manifest = Join-Path $RepoRoot ".overlay\CHECKSUMS.sha256"
if (!(Test-Path $Manifest)) { throw "Overlay checksum manifest missing: $Manifest" }

$ManifestText = (Get-Content -LiteralPath $Manifest -Raw) -replace "\\", "/" # PHASE191_QA_NORMALIZE_MANIFEST_PATHS
foreach ($Needle in @(
  ".overlay/phase191_full_autopilot_from_beginning_proof_v1.json",
  ".sera-proof/phase191_full_autopilot_from_beginning_proof_v1.json",
  "scripts/verify-phase191-full-autopilot-from-beginning-proof-v1.ps1",
  "scripts/phase191-full-autopilot-from-beginning-proof-v1.ps1"
)) {
  if ($ManifestText -notlike "*$Needle*") { throw "Checksum manifest missing $Needle" }
  Write-Host "PHASE191_QA_MANIFEST_ENTRY $Needle"
}

$OverlayJson = Get-Content -LiteralPath (Join-Path $RepoRoot ".overlay\$PhaseSlug.json") -Raw | ConvertFrom-Json
if ([string]$OverlayJson.phaseSlug -ne $PhaseSlug) { throw "Overlay phaseSlug mismatch." }
if ([int]$OverlayJson.phase -ne 191) { throw "Overlay phase number mismatch." }
if ([string]$OverlayJson.expectedZipFilename -ne "s.e.r.a_phase191_full_autopilot_from_beginning_proof_v1_overlay.zip") { throw "Overlay expected ZIP mismatch." }

$Out = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"
@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Branch: $(git branch --show-current)
Timestamp: $Stamp
Tag: $TagName

Result: Phase191 QA passed for the full-autopilot-from-beginning proof overlay.

Proof:
- Fresh current-phase VERIFY_PASS handoff was found: $($Verifier.FullName)
- Overlay checksum manifest exists and includes Phase191 overlay/proof/verifier/QA entries.
- Overlay JSON has the correct Phase191 phaseSlug, phase number, and exact expected ZIP filename.
- This QA creates only proof artifacts and does not alter credentials, dependencies, paid services, or scheduled tasks.
"@ | Set-Content -LiteralPath $Out -Encoding UTF8

Write-Host "PASS_GUARANTEED $Out"
exit 0

