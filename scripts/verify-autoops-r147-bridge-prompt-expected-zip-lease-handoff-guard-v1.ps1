param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$PhaseSlug = "autoops_r147_bridge_prompt_expected_zip_lease_handoff_guard_v1"
$Required = @(
  ".overlay\autoops_r147_bridge_prompt_expected_zip_lease_handoff_guard_v1.json",
  ".sera-proof\autoops_r147_bridge_prompt_expected_zip_lease_handoff_guard_v1.json",
  "docs\autoops-r147-bridge-prompt-expected-zip-lease-handoff-guard-v1.md",
  "scripts\autoops-r147-bridge-prompt-expected-zip-lease-handoff-guard-v1.ps1",
  "scripts\verify-autoops-r147-bridge-prompt-expected-zip-lease-handoff-guard-v1.ps1",
  "tests\integration\autoops-r147-bridge-prompt-expected-zip-lease-handoff-guard-v1.test.ts"
)

$Issues = New-Object System.Collections.Generic.List[string]
foreach ($Rel in $Required) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) { $Issues.Add("Missing required file: $Rel") }
}
$Script = Join-Path $RepoRoot "scripts\autoops-r147-bridge-prompt-expected-zip-lease-handoff-guard-v1.ps1"
if (Test-Path $Script) {
  $Text = Get-Content $Script -Raw
  foreach ($Needle in @(
    "SERA ChatGPT Artifact Watcher",
    "generation-lease.json",
    "expectedZipFilename",
    "Bridge prompt expected ZIP mismatch",
    "New-CorrectedBridgePrompt",
    "autoops-r147-bridge-prompt-lease-handoff",
    "allowRandomRecentChatFallback = `$false",
    "allowNewChatFallback = `$false",
    "original-SERA_ChatGPT_Artifact_Watcher-action.json"
  )) {
    if ($Text -notlike "*$Needle*") { $Issues.Add("Runtime script missing expected guard text: $Needle") }
  }
}
if ($Issues.Count -gt 0) {
  [pscustomobject]@{ ok = $false; phase = "AutoOps R147"; phaseSlug = $PhaseSlug; issues = $Issues } | ConvertTo-Json -Depth 10
  exit 1
}
[pscustomobject]@{ ok = $true; phase = "AutoOps R147"; phaseSlug = $PhaseSlug; repoRoot = $RepoRoot; checkedFiles = $Required; issues = @() } | ConvertTo-Json -Depth 10
