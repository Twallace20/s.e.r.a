param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = "Stop"
$files = @(
  ".overlay\autoops_r149_canonical_bridge_prompt_initial_submit_delegation_v1.json",
  ".sera-proof\autoops_r149_canonical_bridge_prompt_initial_submit_delegation_v1.json",
  "docs\autoops-r149-canonical-bridge-prompt-initial-submit-delegation-v1.md",
  "scripts\autoops-r149-canonical-bridge-prompt-initial-submit-delegation-v1.ps1",
  "scripts\verify-autoops-r149-canonical-bridge-prompt-initial-submit-delegation-v1.ps1",
  "tests\integration\autoops-r149-canonical-bridge-prompt-initial-submit-delegation-v1.test.ts"
)
$issues = @()
foreach ($file in $files) { if (!(Test-Path (Join-Path $RepoRoot $file))) { $issues += "Missing $file" } }
$script = Join-Path $RepoRoot "scripts\autoops-r149-canonical-bridge-prompt-initial-submit-delegation-v1.ps1"
if (Test-Path $script) {
  $content = Get-Content $script -Raw
  foreach ($needle in @("Expected ZIP filename", "prompt-submission-lock.json", "SERA_ChatGPT_Artifact_Watcher_R149_Guard.vbs", "R145OriginalActionJson", "allowRandomRecentChatFallback = $false", "allowNewChatFallback = $false")) {
    if ($content -notlike "*$needle*") { $issues += "Script missing required marker: $needle" }
  }
}
$result = [ordered]@{ ok = ($issues.Count -eq 0); phase = "AutoOps R149"; phaseSlug = "autoops_r149_canonical_bridge_prompt_initial_submit_delegation_v1"; repoRoot = $RepoRoot; checkedFiles = $files; issues = $issues }
$result | ConvertTo-Json -Depth 10
if ($issues.Count -gt 0) { exit 1 }
