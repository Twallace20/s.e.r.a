param([string]$RepoRoot = (Get-Location).Path)
$ErrorActionPreference = "Stop"
$slug = "autoops_r150_submission_request_download_proof_guard_v1"
$files = @(
  ".overlay\$slug.json",
  ".sera-proof\$slug.json",
  "docs\autoops-r150-submission-request-download-proof-guard-v1.md",
  "scripts\autoops-r150-submission-request-download-proof-guard-v1.ps1",
  "scripts\verify-autoops-r150-submission-request-download-proof-guard-v1.ps1",
  "tests\integration\autoops-r150-submission-request-download-proof-guard-v1.test.ts"
)
$issues = @()
foreach ($f in $files) { if (!(Test-Path (Join-Path $RepoRoot $f))) { $issues += "Missing required file: $f" } }
$scriptPath = Join-Path $RepoRoot "scripts\autoops-r150-submission-request-download-proof-guard-v1.ps1"
if (Test-Path $scriptPath) {
  $s = Get-Content $scriptPath -Raw
  foreach ($marker in @("artifact-watch-request.json", "Write-ArtifactWatchRequest", "Invoke-RawWatcherOnce", "Route-ExpectedZip", "allowRandomRecentChatFallback = False", "allowNewChatFallback = False")) {
    if ($s -notmatch [regex]::Escape($marker)) { $issues += "Script missing required marker: $marker" }
  }
}
$result = [ordered]@{ ok=($issues.Count -eq 0); phase="AutoOps R150"; phaseSlug=$slug; repoRoot=$RepoRoot; checkedFiles=$files; issues=$issues }
$result | ConvertTo-Json -Depth 10
if ($issues.Count -gt 0) { exit 1 }
