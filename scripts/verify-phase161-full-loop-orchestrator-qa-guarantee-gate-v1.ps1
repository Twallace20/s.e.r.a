param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

$ScriptPath = Join-Path $RepoRoot 'scripts\phase161-full-loop-orchestrator-qa-guarantee-gate-v1.ps1'
$DocPath = Join-Path $RepoRoot 'docs\phase161-full-loop-orchestrator-qa-guarantee-gate-v1.md'
$OverlayPath = Join-Path $RepoRoot '.overlay\phase161_full_loop_orchestrator_qa_guarantee_gate_v1.json'
$ProofPath = Join-Path $RepoRoot '.sera-proof\phase161_full_loop_orchestrator_qa_guarantee_gate_v1.json'

foreach ($Path in @($ScriptPath,$DocPath,$OverlayPath,$ProofPath)) {
  if (!(Test-Path $Path)) { throw "Missing required Phase161 file: $Path" }
}

$Script = Get-Content $ScriptPath -Raw
foreach ($Marker in @(
  'Get-NextCommandFromInbox',
  'Get-LatestClosedPhaseNumber',
  'New-CanonicalPromptRequestLease',
  'Test-RequestFreshness',
  'Invoke-QAGuarantee',
  'PASS_GUARANTEED',
  'Write-RunSnapshot',
  'Write-BlockedHandoff',
  'safeAutoMergeEligible'
)) {
  if ($Script -notlike "*$Marker*") { throw "Missing Phase161 marker: $Marker" }
}

$Overlay = Get-Content $OverlayPath -Raw | ConvertFrom-Json
if ($Overlay.phase -ne 161) { throw 'Overlay phase must be 161' }
if ($Overlay.expectedZipFilename -ne 's.e.r.a_phase161_full_loop_orchestrator_qa_guarantee_gate_v1_overlay.zip') { throw 'Overlay expected ZIP mismatch' }

$Proof = Get-Content $ProofPath -Raw | ConvertFrom-Json
if ($Proof.phase -ne 161) { throw 'Proof phase must be 161' }

$Output = powershell -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -Mode QaSelfTest 2>&1
$Text = ($Output | Out-String)
if ($LASTEXITCODE -ne 0) { throw "QaSelfTest failed: $Text" }
$JsonLine = ($Output | Where-Object { $_ -match '^\s*\{' } | Select-Object -Last 1)
if (!$JsonLine) { throw "QaSelfTest did not emit JSON: $Text" }
$Result = $Text.Trim() | Select-String -Pattern '\{[\s\S]*\}' | Select-Object -Last 1
# Convert the full output if it is JSON; otherwise use direct parse of captured line fallback.
try { $Parsed = $Text | ConvertFrom-Json } catch { $Parsed = $JsonLine | ConvertFrom-Json }
if (!$Parsed.ok -or $Parsed.status -ne 'PASS') { throw "QaSelfTest did not pass: $Text" }

[ordered]@{
  phase = 161
  status = 'PASS'
  verifier = 'phase161-full-loop-orchestrator-qa-guarantee-gate-v1'
  checks = @(
    'required files exist',
    'sequencer markers present',
    'overlay/proof metadata valid',
    'QaSelfTest command sequencing passed',
    'fresh request proof passed',
    'stale request rejection passed',
    'BLOCKED handoff proof passed',
    'PASS_GUARANTEED proof passed',
    'owner boundary block proof passed'
  )
  createdAt = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json -Depth 20
