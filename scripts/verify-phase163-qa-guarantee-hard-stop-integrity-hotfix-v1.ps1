$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Required = @(
  ".overlay\phase163_qa_guarantee_hard_stop_integrity_hotfix_v1.json",
  ".sera-proof\phase163_qa_guarantee_hard_stop_integrity_hotfix_v1.json",
  "docs\phase163-qa-guarantee-hard-stop-integrity-hotfix-v1.md",
  "scripts\phase163-qa-guarantee-hard-stop-integrity-hotfix-v1.ps1"
)

$Failures = @()
foreach ($Rel in $Required) {
  $Path = Join-Path $Root $Rel
  if (!(Test-Path -LiteralPath $Path)) { $Failures += "Missing required file: $Rel" }
}

$ScriptPath = Join-Path $Root "scripts\phase163-qa-guarantee-hard-stop-integrity-hotfix-v1.ps1"
$ScriptText = Get-Content -LiteralPath $ScriptPath -Raw

$Markers = @(
  "Get-VerifierDecision",
  "QA_BLOCKED",
  "PASS_GUARANTEED",
  "NativeCommandError",
  "parameter cannot be found",
  "missing_explicit_status_PASS",
  "existing_QA_BLOCKED_blocks_PASS_GUARANTEED",
  "Write-CurrentHandoff",
  "CURRENT_CHATGPT_HANDOFF.md",
  "MERGE_PENDING movement blocked",
  "exit 2"
)

foreach ($Marker in $Markers) {
  if ($ScriptText -notlike "*$Marker*") { $Failures += "Missing marker: $Marker" }
}

$SelfTestOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -SelfTest 2>&1
$SelfTestExit = $LASTEXITCODE
$SelfTestText = ($SelfTestOutput | Out-String)

if ($SelfTestExit -ne 0) {
  $Failures += "SelfTest exited nonzero: $SelfTestExit :: $SelfTestText"
}

try {
  $SelfTestJson = $SelfTestText | ConvertFrom-Json -ErrorAction Stop
  if ([string]$SelfTestJson.status -ne "PASS") { $Failures += "SelfTest did not return status PASS" }
} catch {
  $Failures += "SelfTest output was not JSON: $SelfTestText"
}

if ($Failures.Count -gt 0) {
  [ordered]@{
    phase = 163
    status = "FAIL"
    verifier = "phase163-qa-guarantee-hard-stop-integrity-hotfix-v1"
    failures = $Failures
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json -Depth 20
  exit 1
}

[ordered]@{
  phase = 163
  status = "PASS"
  verifier = "phase163-qa-guarantee-hard-stop-integrity-hotfix-v1"
  checks = @(
    "required files exist",
    "QA_BLOCKED terminal markers present",
    "PASS_GUARANTEED explicit PASS guard present",
    "PowerShell error text detection present",
    "MERGE_PENDING blocked after QA failure",
    "CURRENT_CHATGPT_HANDOFF terminal writing present",
    "self-test pass/fail cases passed"
  )
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 20
exit 0
