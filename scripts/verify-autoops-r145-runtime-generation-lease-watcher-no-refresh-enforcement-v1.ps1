[CmdletBinding()]
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = "Stop"

$Issues = New-Object System.Collections.Generic.List[string]
$PhaseSlug = "autoops_r145_runtime_generation_lease_watcher_no_refresh_enforcement_v1"

$RequiredFiles = @(
  ".overlay\$PhaseSlug.json",
  ".sera-proof\$PhaseSlug.json",
  "docs\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.md",
  "scripts\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1",
  "scripts\verify-autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1",
  "tests\integration\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.test.ts"
)

foreach ($Rel in $RequiredFiles) {
  $Path = Join-Path $RepoRoot $Rel
  if (!(Test-Path $Path)) { $Issues.Add("Missing required file: $Rel") }
}

$ManifestPath = Join-Path $RepoRoot ".overlay\$PhaseSlug.json"
if (Test-Path $ManifestPath) {
  try {
    $Manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
    if ($Manifest.expectedZipFilename -ne "s.e.r.a_autoops_r145_runtime_generation_lease_watcher_no_refresh_enforcement_v1_overlay.zip") {
      $Issues.Add("Manifest expectedZipFilename mismatch.")
    }
    if ($Manifest.safety.allowRandomRecentChatFallback -ne $false) { $Issues.Add("Random recent chat fallback is not explicitly disabled.") }
    if ($Manifest.safety.allowNewChatFallback -ne $false) { $Issues.Add("New-chat fallback is not explicitly disabled.") }
    if ($Manifest.safety.savedChatGptTargetOnly -ne $true) { $Issues.Add("Saved ChatGPT target only is not explicitly enforced.") }
  } catch {
    $Issues.Add("Manifest is not valid JSON: $($_.Exception.Message)")
  }
}

$ScriptPath = Join-Path $RepoRoot "scripts\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.ps1"
if (Test-Path $ScriptPath) {
  $ScriptText = Get-Content $ScriptPath -Raw

  $Needles = @(
    "generation-lease.json",
    "ALLOW_BROWSER_REFRESH_DIAGNOSTIC.flag",
    "doNotRefresh",
    "doNotResubmit",
    "Route-R145ExpectedZip",
    "Test-R145StableFile",
    "prompt-submission-lock.json",
    "allowRandomRecentChatFallback = `$false",
    "allowNewChatFallback = `$false",
    "Set-ScheduledTask",
    "RefreshMinutes 0",
    "expectedZipName",
    "sourcePath",
    "destinationPath",
    "SHA256",
    "routeTimestamp",
    "routeMode"
  )

  foreach ($Needle in $Needles) {
    if ($ScriptText -notlike "*$Needle*") { $Issues.Add("Runtime script missing required marker: $Needle") }
  }

  $SelfTest = & powershell -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -SelfTest
  if ($LASTEXITCODE -ne 0) { $Issues.Add("Runtime self-test exited with code $LASTEXITCODE") }
  try {
    $Self = $SelfTest | ConvertFrom-Json
    if ($Self.ok -ne $true) { $Issues.Add("Runtime self-test did not report ok=true.") }
    if ($Self.activeLeaseBlockedRefresh -ne $true) { $Issues.Add("Runtime self-test did not prove active lease blocks refresh.") }
    if ($Self.exactZipRoutingEvidenceRequired -ne $true) { $Issues.Add("Runtime self-test did not prove exact ZIP routing evidence requirement.") }
  } catch {
    $Issues.Add("Runtime self-test did not return valid JSON: $($_.Exception.Message)")
  }
}

$TestPath = Join-Path $RepoRoot "tests\integration\autoops-r145-runtime-generation-lease-watcher-no-refresh-enforcement-v1.test.ts"
if (Test-Path $TestPath) {
  $TestText = Get-Content $TestPath -Raw
  foreach ($Needle in @("generation-lease.json", "ALLOW_BROWSER_REFRESH_DIAGNOSTIC.flag", "doNotRefresh", "doNotResubmit", "RefreshMinutes 0", "expectedZipName")) {
    if ($TestText -notlike "*$Needle*") { $Issues.Add("Test file missing marker: $Needle") }
  }
}

$Result = [ordered]@{
  ok = ($Issues.Count -eq 0)
  phase = "AutoOps R145"
  phaseSlug = $PhaseSlug
  repoRoot = $RepoRoot
  checkedFiles = $RequiredFiles
  issues = @($Issues)
}

$Result | ConvertTo-Json -Depth 20

if ($Issues.Count -gt 0) { exit 1 }
exit 0
