param(
  [Alias("OverlayZipPath","ExpectedZipPath")][string]$ZipPath,
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [Alias("PhaseNumber")][string]$Phase,
  [string]$PhaseSlug,
  [string]$PhaseName,
  [string]$Branch,
  [string]$TagName,
  [string]$ExpectedSha256,
  [switch]$LaunchBrowserIfNeeded,
  [Parameter(ValueFromRemainingArguments=$true)][string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Run-Git {
  param(
    [string]$Label,
    [string[]]$ArgList,
    [switch]$AllowFail
  )

  Write-Step "RUN: git $($ArgList -join ' ')"
  & git @ArgList
  $Code = $LASTEXITCODE

  if ($Code -ne 0 -and -not $AllowFail) {
    throw "$Label failed with exit $Code"
  }

  return $Code
}

function Convert-PhaseSlugToHyphen {
  param([string]$Slug)
  return ($Slug -replace "_","-")
}

function Convert-PhaseSlugToTag {
  param([string]$Slug)
  if ($Slug -match "^phase(\d+)_(.+)$") {
    return "phase-$($Matches[1])-" + ($Matches[2] -replace "_","-")
  }
  return ($Slug -replace "_","-")
}

function Repair-NestedOverlayPaths {
  param([string]$Root)

  $Pairs = @(
    @{ Nested = ".overlay\.overlay"; Target = ".overlay" },
    @{ Nested = ".sera-proof\.sera-proof"; Target = ".sera-proof" },
    @{ Nested = "docs\docs"; Target = "docs" },
    @{ Nested = "scripts\scripts"; Target = "scripts" }
  )

  foreach ($Pair in $Pairs) {
    $NestedPath = Join-Path $Root $Pair.Nested
    $TargetPath = Join-Path $Root $Pair.Target

    if (!(Test-Path $NestedPath)) {
      continue
    }

    New-Item -ItemType Directory -Force $TargetPath | Out-Null

    Get-ChildItem -LiteralPath $NestedPath -Force | ForEach-Object {
      $Destination = Join-Path $TargetPath $_.Name

      if (Test-Path $Destination) {
        Remove-Item $Destination -Recurse -Force
      }

      Move-Item -LiteralPath $_.FullName -Destination $Destination -Force
      Write-Step "FLATTENED $($Pair.Nested)\$($_.Name) -> $($Pair.Target)\$($_.Name)"
    }

    Remove-Item $NestedPath -Recurse -Force
  }
}

function Write-BlockedHandoff {
  param(
    [string]$Reason,
    [string]$BranchName,
    [string]$RunId
  )

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $HandoffRoot "$PhaseName-$Stamp-BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseName
Branch: $BranchName
Timestamp: $Stamp
RunId: $RunId

Reason:
$Reason

Gate result:
Merge was not attempted.
QA was not run after verifier failure unless verifier passed in this run.
CLOSED_CLEANLY was not written.
"@ | Set-Content $Path -Encoding UTF8

  Write-Host "BLOCKED_HANDOFF: $Path"
  return $Path
}

function Invoke-FinalPastebackSafe {
  param([string]$HandoffPath)

  $Pasteback = Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1"

  if (!(Test-Path $Pasteback)) {
    Write-Step "PASTEBACK_SKIPPED_SAFE helper_missing=$Pasteback"
    return
  }

  try {
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Pasteback -HandoffPath $HandoffPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -LaunchBrowserIfNeeded:$LaunchBrowserIfNeeded
    $Code = $LASTEXITCODE
    Write-Step "FINAL_HANDOFF_PASTEBACK_EXIT_CODE $Code"
  } catch {
    Write-Step "PASTEBACK_SKIPPED_SAFE exception=$($_.Exception.Message)"
  }
}

function Fail-Gate {
  param(
    [string]$Reason,
    [string]$BranchName,
    [string]$RunId
  )

  $BlockedPath = Write-BlockedHandoff -Reason $Reason -BranchName $BranchName -RunId $RunId
  Get-Content $BlockedPath -Raw | Set-Clipboard
  Write-Step "FINAL_HANDOFF_COPIED $BlockedPath"
  Invoke-FinalPastebackSafe -HandoffPath $BlockedPath
  throw $Reason
}

function Invoke-RequiredScript {
  param(
    [string]$Role,
    [string]$Path,
    [string[]]$Arguments,
    [string]$BranchName,
    [string]$RunId
  )

  if (!(Test-Path $Path)) {
    Fail-Gate -Reason "Required ${Role} script missing: $Path" -BranchName $BranchName -RunId $RunId
  }

  Write-Step "INVOKE_REQUIRED_SCRIPT role=$Role path=$Path"
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Path @Arguments
  $Code = $LASTEXITCODE

  if ($Code -ne 0) {
    $Reason = "Required ${Role} script failed with exit ${Code}: $Path"
    Fail-Gate -Reason $Reason -BranchName $BranchName -RunId $RunId
  }
}

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
Set-Location $RepoRoot

$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$HandoffRoot = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Downloads13,$HandoffRoot | Out-Null

if (!$ZipPath) {
  $Candidate = Get-ChildItem $Downloads13 -File -Filter "s.e.r.a_phase*_overlay.zip" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$Candidate) {
    throw "ZipPath was not supplied and no overlay ZIP was found in $Downloads13"
  }

  $ZipPath = $Candidate.FullName
}

if (!(Test-Path $ZipPath)) {
  throw "Overlay ZIP not found: $ZipPath"
}

$ZipName = [IO.Path]::GetFileName($ZipPath)

if (!$PhaseSlug) {
  if ($ZipName -match "^s\.e\.r\.a_(.+)_overlay\.zip$") {
    $PhaseSlug = $Matches[1]
  } else {
    throw "Could not derive PhaseSlug from ZIP name: $ZipName"
  }
}

if (!$PhaseName) {
  $PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
}

$HyphenSlug = Convert-PhaseSlugToHyphen $PhaseSlug

if (!$Branch) {
  $Branch = "work/$HyphenSlug"
}

if (!$TagName) {
  $TagName = Convert-PhaseSlugToTag $PhaseSlug
}

if (!$Phase -and $PhaseSlug -match "^phase(\d+)") {
  $Phase = $Matches[1]
}

$RunId = Get-Date -Format "yyyyMMdd_HHmmss"

if ($ExpectedSha256) {
  $ActualSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
  if ($ActualSha -ne $ExpectedSha256.ToLowerInvariant()) {
    throw "ZIP SHA mismatch. Expected $ExpectedSha256 but got $ActualSha"
  }
}

Write-Step "RUN_DIRECT_ZIP_CLOSEOUT phase=$Phase branch=$Branch tag=$TagName"
Write-Step "WAIT_ONLY_CLOSED enabled"
Write-Step "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED enabled"

Run-Git "git fetch" @("fetch","origin","--tags")
Run-Git "git switch main" @("switch","main")
Run-Git "git reset main" @("reset","--hard","origin/main")
Run-Git "git switch phase branch" @("switch","-C",$Branch)

$Temp = Join-Path $env:TEMP "sera_overlay_$RunId"
if (Test-Path $Temp) {
  Remove-Item $Temp -Recurse -Force
}
New-Item -ItemType Directory -Force $Temp | Out-Null

Expand-Archive -LiteralPath $ZipPath -DestinationPath $Temp -Force

$OverlayRoot = Join-Path $Temp "repo"
if (!(Test-Path $OverlayRoot)) {
  throw "Overlay ZIP does not contain repo/ root."
}

Get-ChildItem -LiteralPath $OverlayRoot -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $RepoRoot $_.Name) -Recurse -Force
}

Remove-Item $Temp -Recurse -Force

Repair-NestedOverlayPaths -Root $RepoRoot

Run-Git "git add" @("add","--all")
$Status = & git status --porcelain

if ($Status) {
  Run-Git "git commit overlay" @("commit","-m","feat: add $PhaseName")
  Run-Git "git push branch" @("push","-u","origin",$Branch,"--force")
} else {
  Write-Step "No overlay changes to commit."
}

$VerifierPath = Join-Path $RepoRoot "scripts\verify-$HyphenSlug.ps1"
$QaPath = Join-Path $RepoRoot "scripts\$HyphenSlug.ps1"

$VerifierStartedAt = Get-Date
Invoke-RequiredScript -Role "verifier" -Path $VerifierPath -Arguments @("-RepoRoot",$RepoRoot,"-AutoOpsRoot",$AutoOpsRoot) -BranchName $Branch -RunId $RunId

$FreshVerify = Get-ChildItem $HandoffRoot -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge $VerifierStartedAt.AddSeconds(-5) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$FreshVerify) {
  Fail-Gate -Reason "Fresh VERIFY_PASS handoff not found after verifier. QA and merge were not run." -BranchName $Branch -RunId $RunId
}

$QaStartedAt = Get-Date
Invoke-RequiredScript -Role "QA" -Path $QaPath -Arguments @("-RepoRoot",$RepoRoot,"-AutoOpsRoot",$AutoOpsRoot) -BranchName $Branch -RunId $RunId

$LatestPass = Get-ChildItem $HandoffRoot -File -Filter "$PhaseName-*PASS_GUARANTEED.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge $QaStartedAt.AddSeconds(-5) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$LatestPass) {
  Fail-Gate -Reason "Fresh PASS_GUARANTEED handoff not found after QA. Merge was not run." -BranchName $Branch -RunId $RunId
}

Write-Step "FRESH_PASS_GUARANTEED $($LatestPass.FullName)"

Run-Git "git switch main" @("switch","main")
Run-Git "git reset main" @("reset","--hard","origin/main")
Run-Git "git merge phase branch" @("merge","--no-ff",$Branch,"-m","merge: close $TagName")
Run-Git "git tag phase" @("tag","-f",$TagName)
Run-Git "git push main" @("push","origin","main")
Run-Git "git push tag" @("push","origin",$TagName,"--force")
Run-Git "git delete remote branch" @("push","origin",":$Branch") -AllowFail
Run-Git "git delete local branch" @("branch","-D",$Branch) -AllowFail

$CloseStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ClosedPath = Join-Path $HandoffRoot "$PhaseName-$CloseStamp-CLOSED_CLEANLY.md"

@"
Status: CLOSED_CLEANLY
Phase: $PhaseName
Branch: main
Timestamp: $CloseStamp
RunId: $RunId
Tag: $TagName

Result:
Phase closed cleanly through direct ZIP-to-closeout.

Proof:
- Overlay ZIP was applied from exact ZIP path.
- Nested overlay paths were flattened.
- Fresh VERIFY_PASS was required before QA.
- QA produced fresh PASS_GUARANTEED.
- Safe merge/tag/push/cleanup completed.
- Final current-phase handoff was copied.
- Final handoff pasteback was attempted safely for the current ChatGPT target only.

Markers:
SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED
WAIT_ONLY_CLOSED
CLOSED_CLEANLY
FINAL_HANDOFF_PASTEBACK_START
"@ | Set-Content $ClosedPath -Encoding UTF8

Get-Content $ClosedPath -Raw | Set-Clipboard
Write-Step "FINAL_HANDOFF_COPIED $ClosedPath"

Invoke-FinalPastebackSafe -HandoffPath $ClosedPath

Write-Host ""
Write-Host "=== DIRECT ZIP CLOSEOUT CLOSED_CLEANLY CONFIRMED ==="
Write-Host $ClosedPath
exit 0

# PHASE179_SCALAR_TIMESTAMP_FIX: verifier and QA start times are scalar DateTime values; Invoke-RequiredScript output is not assigned to time variables.

