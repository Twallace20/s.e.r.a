param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase175_gate_integrity_enforcement_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Require-File {
  param([string]$RelativePath)
  $Path = Join-Path $RepoRoot $RelativePath
  if (!(Test-Path $Path)) {
    throw "Missing required file: $RelativePath"
  }
  return $Path
}

function Require-Marker {
  param(
    [string]$Text,
    [string]$Marker,
    [string]$Source
  )
  if ($Text -notlike "*$Marker*") {
    throw "$Source missing hardening marker: $Marker"
  }
}

$Direct = Require-File "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
$Router = Require-File "scripts\sera-full-auto-json-loop-router-v1.ps1"
$Bridge = Require-File "scripts\sera-chatgpt-browser-bridge-v1.ps1"
$Flattener = Require-File "scripts\sera-repair-nested-overlay-paths-v1.ps1"
$Qa = Require-File "scripts\phase175-gate-integrity-enforcement-proof-v1.ps1"
$Manifest = Require-File ".overlay\phase175_gate_integrity_enforcement_proof_v1.json"
$Proof = Require-File ".sera-proof\phase175_gate_integrity_enforcement_proof_v1.json"

foreach ($Nested in @(".overlay\.overlay", ".sera-proof\.sera-proof", "docs\docs", "scripts\scripts")) {
  if (Test-Path (Join-Path $RepoRoot $Nested)) {
    throw "Nested overlay path still exists: $Nested"
  }
}

$DirectText = Get-Content $Direct -Raw
$RouterText = Get-Content $Router -Raw
$BridgeText = Get-Content $Bridge -Raw
$QaText = Get-Content $Qa -Raw

foreach ($Marker in @(
  "function Invoke-RequiredScript",
  "function Write-BlockedHandoff",
  "Fresh PASS_GUARANTEED",
  "Refusing merge",
  "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED",
  "WAIT_ONLY_CLOSED"
)) {
  Require-Marker -Text $DirectText -Marker $Marker -Source "Direct closeout"
}

Require-Marker -Text $RouterText -Marker "RUN_DIRECT_ZIP_CLOSEOUT" -Source "Router"
Require-Marker -Text $BridgeText -Marker "IGNORING_STALE_ARTIFACT" -Source "Browser bridge"
Require-Marker -Text $BridgeText -Marker "exact_expected_download_control_not_ready" -Source "Browser bridge"
Require-Marker -Text $QaText -Marker "PASS_GUARANTEED" -Source "QA script"

$VerifierIdx = $DirectText.IndexOf('$VerifierRun = Invoke-RequiredScript')
$QaIdx = $DirectText.IndexOf('$QaRun = Invoke-RequiredScript')
$PassIdx = $DirectText.IndexOf('$LatestPass')
$MergeIdx = $DirectText.IndexOf('git merge branch')

if ($VerifierIdx -lt 0) { throw "Verifier required invocation not found." }
if ($QaIdx -lt 0) { throw "QA required invocation not found." }
if ($QaIdx -le $VerifierIdx) { throw "QA invocation occurs before verifier invocation." }
if ($PassIdx -lt 0) { throw "Fresh PASS_GUARANTEED lookup not found." }
if ($MergeIdx -lt 0) { throw "Merge invocation not found." }
if ($MergeIdx -le $PassIdx) { throw "Merge occurs before fresh PASS_GUARANTEED gate." }

$Forbidden = @(
  "Register-ScheduledTask",
  "schtasks",
  "New-Service",
  "Set-Service",
  "Install-Module",
  "npm install",
  "pip install",
  "GITHUB_TOKEN",
  "OPENAI_API_KEY"
)

$FilesToScan = @($Direct, $Router, $Bridge, $Flattener, $Qa, $Manifest, $Proof)
foreach ($File in $FilesToScan) {
  $Text = Get-Content $File -Raw
  foreach ($Needle in $Forbidden) {
    if ($Text -like "*$Needle*") {
      throw "Forbidden marker found in $File :: $Needle"
    }
  }
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Path = Join-Path $Handoff "$PhaseName-$Stamp-VERIFY_PASS.md"

@"
Status: VERIFY_PASS
Phase: $PhaseName
Timestamp: $Stamp

Result:
Verifier passed for Phase175 gate integrity enforcement.

Checks:
- Required files exist.
- Nested overlay paths are absent.
- Direct closeout contains Invoke-RequiredScript and Write-BlockedHandoff gates.
- QA invocation occurs after verifier invocation.
- Merge occurs after fresh PASS_GUARANTEED lookup.
- Browser bridge keeps exact artifact and stale-download fence markers.
"@ | Set-Content $Path -Encoding UTF8

Write-Host "PHASE175_VERIFY PASS"
Write-Host $Path
exit 0
