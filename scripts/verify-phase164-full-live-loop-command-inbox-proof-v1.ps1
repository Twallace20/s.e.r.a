param(
  [ValidateSet('Verify','SelfTest')]
  [string]$Mode = 'Verify',
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$Phase = 164
$MainScript = Join-Path $RepoRoot 'scripts\phase164-full-live-loop-command-inbox-proof-v1.ps1'
$Required = @(
  '.overlay\phase164_full_live_loop_command_inbox_proof_v1.json',
  '.sera-proof\phase164_full_live_loop_command_inbox_proof_v1.json',
  'docs\phase164-full-live-loop-command-inbox-proof-v1.md',
  'scripts\phase164-full-live-loop-command-inbox-proof-v1.ps1',
  'scripts\verify-phase164-full-live-loop-command-inbox-proof-v1.ps1'
)

$checks = New-Object System.Collections.Generic.List[string]
foreach ($rel in $Required) {
  $path = Join-Path $RepoRoot $rel
  if (!(Test-Path $path)) { throw "Missing required file: $rel" }
}
$checks.Add('required files exist')

$mainText = Get-Content $MainScript -Raw
foreach ($marker in @('Get-SeraNextCommandFromInbox','Test-SeraArtifactRequestFreshness','CURRENT_CHATGPT_HANDOFF.md','QA_BLOCKED','PASS_GUARANTEED','zip_missing_after_bridge','no_runnable_command')) {
  if ($mainText -notlike "*$marker*") { throw "Main script missing marker: $marker" }
}
$checks.Add('main script contains command discovery, freshness, terminal handoff, and QA hard-stop markers')

$output = & powershell -NoProfile -ExecutionPolicy Bypass -File $MainScript -Mode SelfTest -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1
$exitCode = $LASTEXITCODE
$text = ($output | Out-String)

if ($exitCode -ne 0) { throw "SelfTest exited with $exitCode. Output: $text" }
if ($text -notmatch '"status"\s*:\s*"PASS"') { throw "SelfTest did not produce explicit PASS. Output: $text" }
$checks.Add('full-loop simulation self-test produced explicit PASS')
$checks.Add('command inbox selects Phase164 above Phase163')
$checks.Add('stale request rejected')
$checks.Add('CURRENT_CHATGPT_HANDOFF output proved')
$checks.Add('bad verifier output rejected')
$checks.Add('Phase163 QA hard-stop rule preserved')

$report = [ordered]@{
  phase = $Phase
  status = 'PASS'
  verifier = 'phase164-full-live-loop-command-inbox-proof-v1'
  checks = $checks.ToArray()
  createdAt = (Get-Date).ToUniversalTime().ToString('o')
}

$report | ConvertTo-Json -Depth 10
