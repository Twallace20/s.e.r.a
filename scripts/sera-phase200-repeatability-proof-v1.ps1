[CmdletBinding()]
param(
  [object]$ConfirmedPromptSubmit = $null,
  [object]$ExactDomDownload = $null,
  [object]$ExactDomArtifactClick = $null,
  [object]$ExactZipDownloaded = $null,
  [object]$ExactZipShaVerified = $null,
  [object]$ZipShaVerified = $null,
  [object]$VerifierGateReady = $null,
  [object]$VerifierPassed = $null,
  [object]$QaPassed = $null,
  [object]$CleanBaselineVerified = $null,
  [object]$Phase199RemoteTruthVerified = $null,
  [object]$PromptTextCompatVerified = $null,
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Phase199Commit = "51128d59aadb81a11aa0001e58778530295b4454"
$Phase199Tag = "phase-199-post-closeout-clean-repo-endurance-autopilot-v1"
$PromptTextCompatCommit = "2404acb035e061857856f664eba4a4c76254020b"
$ExpectedZip = "s.e.r.a_phase200_repeat_full_autopilot_clean_baseline_proof_v1_overlay.zip"
$ExpectedSha = "13989effaab5331fb0066b69c2e815731a1b6301289457b8819942700776656a"

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  Push-Location $RepoRoot
  try {
    return @(git @Args)
  } finally {
    Pop-Location
  }
}

function Add-Missing {
  param(
    [System.Collections.Generic.List[string]]$Missing,
    [string]$Gate,
    [bool]$Condition
  )
  if (!$Condition) {
    $Missing.Add($Gate) | Out-Null
  }
}

$Missing = [System.Collections.Generic.List[string]]::new()

$ZipPath = Join-Path $AutoOpsRoot "13_chatgpt_downloads\$ExpectedZip"
$ZipExists = Test-Path -LiteralPath $ZipPath
$ZipSha = $null
if ($ZipExists) {
  $ZipSha = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
}

$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"
$RecentLogs = @(Get-ChildItem $LogDir -File -Filter "*.log" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 10)

$LogText = ""
foreach ($Log in $RecentLogs) {
  $LogText += "`n--- LOG: $($Log.FullName) ---`n"
  $LogText += Get-Content -LiteralPath $Log.FullName -Raw
}

$CurrentBranch = (Invoke-Git branch --show-current | Select-Object -First 1).Trim()
$Status = @(Invoke-Git status --short --untracked-files=all)
$OriginMain = (Invoke-Git rev-parse origin/main | Select-Object -First 1).Trim()
$LocalTag = (Invoke-Git rev-parse "$Phase199Tag^{commit}" | Select-Object -First 1).Trim()
$Head = (Invoke-Git rev-parse HEAD | Select-Object -First 1).Trim()

Invoke-Git merge-base --is-ancestor $PromptTextCompatCommit HEAD | Out-Null
$CompatInAncestry = ($LASTEXITCODE -eq 0)

Invoke-Git merge-base --is-ancestor $Phase199Commit HEAD | Out-Null
$Phase199InAncestry = ($LASTEXITCODE -eq 0)

Add-Missing $Missing "phase200_work_branch" ($CurrentBranch -eq "work/phase200-repeat-full-autopilot-clean-baseline-proof-v1")
Add-Missing $Missing "phase199_origin_main_truth" ($OriginMain -eq $Phase199Commit)
Add-Missing $Missing "phase199_tag_truth" ($LocalTag -eq $Phase199Commit)
Add-Missing $Missing "phase199_in_phase200_ancestry" $Phase199InAncestry
Add-Missing $Missing "prompttext_compat_commit_in_ancestry" $CompatInAncestry
Add-Missing $Missing "exact_phase200_zip_exists" $ZipExists
Add-Missing $Missing "exact_phase200_zip_sha" ($ZipSha -eq $ExpectedSha)
Add-Missing $Missing "confirmed_prompt_submit_marker" ($LogText -match "PROMPT_SUBMIT_RESULT" -and $LogText -match "prompt_submitted_by_native_")
Add-Missing $Missing "exact_dom_artifact_click_marker" ($LogText -match "ARTIFACT_DOWNLOAD_V6_CLICK_RESULT.*`"ok`":true")
Add-Missing $Missing "exact_zip_download_marker" ($LogText -match [regex]::Escape("ARTIFACT_DOWNLOAD_V6_DOWNLOADED") -and $LogText -match [regex]::Escape($ExpectedZip))
Add-Missing $Missing "zip_ready_marker" ($LogText -match [regex]::Escape("ZIP_READY") -and $LogText -match [regex]::Escape($ExpectedZip))
Add-Missing $Missing "direct_closeout_started_marker" ($LogText -match "RUN_DIRECT_ZIP_CLOSEOUT phase=200")
Add-Missing $Missing "repo_clean" ($Status.Count -eq 0)

if ($Missing.Count -gt 0) {
  [ordered]@{
    status = "BLOCKED"
    reason = "Phase200 repeatability proof gates missing."
    phase = 200
    phaseSlug = "phase200_repeat_full_autopilot_clean_baseline_proof_v1"
    missing = @($Missing)
    branch = $CurrentBranch
    head = $Head
    originMain = $OriginMain
    phase199TagCommit = $LocalTag
    zipPath = $ZipPath
    zipSha256 = $ZipSha
  } | ConvertTo-Json -Depth 10
  exit 1
}

[ordered]@{
  status = "PASS"
  reason = "Phase200 repeatability proof gates passed."
  phase = 200
  phaseSlug = "phase200_repeat_full_autopilot_clean_baseline_proof_v1"
  missing = @()
  branch = $CurrentBranch
  head = $Head
  originMain = $OriginMain
  phase199TagCommit = $LocalTag
  zipPath = $ZipPath
  zipSha256 = $ZipSha
  note = "Phase200 repeatability gates passed after repair; Phase201 is still required for no-rescue certification."
} | ConvertTo-Json -Depth 10

exit 0
