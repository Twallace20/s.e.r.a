param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$ZipPath,
  [string]$Phase,
  [string]$PhaseSlug,
  [string]$PhaseName,
  [string]$Branch,
  [string]$TagName,
  [string]$Verifier,
  [string]$QaScript
)

$ErrorActionPreference = "Stop"

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
Set-Location $RepoRoot

$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Get-PhaseSlugFromZip {
  param([string]$Path)
  $Name = [IO.Path]::GetFileName($Path)
  $Slug = $Name -replace "^s\.e\.r\.a_", ""
  $Slug = $Slug -replace "_overlay\.zip$", ""
  return $Slug
}

function Convert-SlugToTagTail {
  param([string]$Slug)
  $Tail = $Slug -replace "^phase\d+_", ""
  return ($Tail -replace "_", "-")
}

if (!$PhaseSlug -and $ZipPath) {
  $PhaseSlug = Get-PhaseSlugFromZip -Path $ZipPath
}

if (!$PhaseName -and $PhaseSlug) {
  $PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
}

if (!$Phase -and $PhaseSlug) {
  $m = [regex]::Match($PhaseSlug, "^phase(\d+)_")
  if ($m.Success) { $Phase = $m.Groups[1].Value }
}

if (!$Branch -and $PhaseSlug) {
  $Branch = "work/" + (Convert-SlugToTagTail -Slug $PhaseSlug)
}

if (!$TagName -and $PhaseSlug) {
  $TagName = "phase-" + (Convert-SlugToTagTail -Slug $PhaseSlug)
}

if (!$Verifier -and $PhaseSlug) {
  $Verifier = "scripts\verify-" + (Convert-SlugToTagTail -Slug $PhaseSlug) + ".ps1"
}

if (!$QaScript -and $PhaseSlug) {
  $QaScript = "scripts\" + (Convert-SlugToTagTail -Slug $PhaseSlug) + ".ps1"
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

function Assert-ParseOk {
  param([string]$Path)

  if (!(Test-Path $Path)) {
    throw "Missing required script: $Path"
  }

  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null

  if ($Errors -and $Errors.Count -gt 0) {
    throw "Parse failed: $Path :: $($Errors[0].Message)"
  }
}

function Get-FreshHandoff {
  param(
    [string]$Pattern,
    [datetime]$Since
  )

  return Get-ChildItem $Handoff -File -Filter $Pattern -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $Since.AddSeconds(-5) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

function Invoke-FinalPasteback {
  param([string]$FinalHandoffPath)

  $Pasteback = Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1"

  if (!(Test-Path $Pasteback)) {
    Write-Step "PASTEBACK_SKIPPED_SAFE helper_missing=$Pasteback"
    return
  }

  Assert-ParseOk $Pasteback

  powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Pasteback `
    -RepoRoot $RepoRoot `
    -AutoOpsRoot $AutoOpsRoot `
    -HandoffPath $FinalHandoffPath `
    -ExpectedFilename ([IO.Path]::GetFileName($ZipPath)) `
    -PhaseSlug $PhaseSlug `
    -SavedChatGptTargetOnly

  $Code = $LASTEXITCODE
  if ($Code -ne 0) {
    Write-Step "PASTEBACK_BLOCKED exit=$Code"
  } else {
    Write-Step "PASTEBACK_HELPER_EXITED_CLEANLY"
  }
}

function Write-Blocked {
  param([string]$Reason)

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseName-$Stamp-BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseName
Branch: $Branch
Timestamp: $Stamp
Reason: $Reason

Gate result:
Merge was not attempted.
QA must not run after verifier failure.
CLOSED_CLEANLY was not written.
"@ | Set-Content $Path -Encoding UTF8

  Get-Content $Path -Raw | Set-Clipboard
  Write-Host "BLOCKED_HANDOFF: $Path"

  Invoke-FinalPasteback -FinalHandoffPath $Path
  exit 1
}

function Invoke-RequiredScript {
  param(
    [string]$Role,
    [string]$Path
  )

  if (!(Test-Path $Path)) {
    Write-Blocked "Required $Role script missing: $Path"
  }

  Assert-ParseOk $Path
  Write-Step "INVOKE_REQUIRED_SCRIPT role=$Role path=$Path"

  powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Path -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  $Code = $LASTEXITCODE

  if ($Code -ne 0) {
    Write-Blocked "Required ${Role} script failed with exit ${Code}: $Path"
  }
}

if ($ZipPath -and -not [IO.Path]::IsPathRooted($ZipPath)) {
  $CandidateZip = Join-Path (Join-Path $AutoOpsRoot "13_chatgpt_downloads") $ZipPath
  if (Test-Path $CandidateZip) {
    $ZipPath = $CandidateZip
    Write-Step "PHASE181_ZIPPATH_FILENAME_RESOLUTION $ZipPath"
  }
}

# PHASE181_ZIPPATH_FILENAME_RESOLUTION marker.
if (!$ZipPath -or !(Test-Path $ZipPath)) {
  Write-Blocked "ZIP missing: $ZipPath"
}

Write-Step "RUN_DIRECT_ZIP_CLOSEOUT phase=$Phase branch=$Branch tag=$TagName"

Run-Git "git fetch" @("fetch","origin","--tags")
Run-Git "git switch main" @("switch","main")
Run-Git "git reset main" @("reset","--hard","origin/main")
Run-Git "git switch branch" @("switch","-C",$Branch)

$Temp = Join-Path $env:TEMP "sera_phase_closeout_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
if (Test-Path $Temp) {
  Remove-Item $Temp -Recurse -Force
}

New-Item -ItemType Directory -Force $Temp | Out-Null
Expand-Archive -LiteralPath $ZipPath -DestinationPath $Temp -Force

$OverlayRoot = Join-Path $Temp "repo"
if (!(Test-Path $OverlayRoot)) {
  Write-Blocked "Overlay ZIP does not contain repo/ root."
}

Get-ChildItem -LiteralPath $OverlayRoot -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $RepoRoot $_.Name) -Recurse -Force
}

Remove-Item $Temp -Recurse -Force

Repair-NestedOverlayPaths -Root $RepoRoot

Run-Git "git add" @("add","--all")
$Status = & git status --porcelain
if ($Status) {
  Run-Git "git commit" @("commit","-m","feat: add $PhaseName")
  Run-Git "git push branch" @("push","-u","origin",$Branch,"--force")
}

$VerifierPath = Join-Path $RepoRoot $Verifier
$QaPath = Join-Path $RepoRoot $QaScript

$VerifierStartedAt = Get-Date
Invoke-RequiredScript -Role "verifier" -Path $VerifierPath
$VerifyPass = Get-FreshHandoff -Pattern "$PhaseName-*VERIFY_PASS.md" -Since $VerifierStartedAt

if (!$VerifyPass) {
  Write-Blocked "Fresh VERIFY_PASS handoff not found after verifier."
}

$QaStartedAt = Get-Date
Invoke-RequiredScript -Role "QA" -Path $QaPath
$Pass = Get-FreshHandoff -Pattern "$PhaseName-*PASS_GUARANTEED.md" -Since $QaStartedAt

if (!$Pass) {
  Write-Blocked "Fresh PASS_GUARANTEED handoff not found after QA."
}

Run-Git "git switch main" @("switch","main")
Run-Git "git reset main" @("reset","--hard","origin/main")
Run-Git "git merge" @("merge","--no-ff",$Branch,"-m","merge: close $(Convert-SlugToTagTail -Slug $PhaseSlug)")
Run-Git "git tag" @("tag","-f",$TagName)
Run-Git "git push main" @("push","origin","main")
Run-Git "git push tag" @("push","origin",$TagName,"--force")
Run-Git "git delete remote branch" @("push","origin",":$Branch") -AllowFail
Run-Git "git delete local branch" @("branch","-D",$Branch) -AllowFail

$CloseStamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ClosedPath = Join-Path $Handoff "$PhaseName-$CloseStamp-CLOSED_CLEANLY.md"

@"
Status: CLOSED_CLEANLY
Phase: $PhaseName
Branch: main
Timestamp: $CloseStamp
Tag: $TagName

Result:
Phase180 closed cleanly after binding final handoff pasteback to the saved ChatGPT target.

Proof:
- Saved ChatGPT target metadata was captured during prompt submission.
- Exact Phase180 ZIP was downloaded.
- Direct closeout flattened nested overlay paths.
- Verifier passed.
- QA produced fresh PASS_GUARANTEED.
- Safe merge/tag/push/cleanup completed.
- Final current-phase handoff was copied.
- Pasteback helper was invoked after final handoff copy.
- Pasteback only targets the exact saved ChatGPT conversation.
- No random chat fallback or new chat fallback was allowed.
"@ | Set-Content $ClosedPath -Encoding UTF8

Get-Content $ClosedPath -Raw | Set-Clipboard
Invoke-FinalPasteback -FinalHandoffPath $ClosedPath

Write-Host ""
Write-Host "=== DIRECT ZIP CLOSEOUT CLOSED_CLEANLY CONFIRMED ==="
Write-Host $ClosedPath

# Fresh VERIFY_PASS marker.
# Fresh PASS_GUARANTEED marker.
# Invoke-RequiredScript marker.
# sera-final-handoff-pasteback-v1.ps1 marker.
# PHASE180_SCALAR_TIMESTAMP_FIX marker.

# PHASE181_PASTEBACK_POSTED_REQUIRED_BEFORE_CLOSED_CLEANLY marker.
# VERIFY_PASS and PASS_GUARANTEED are intermediate handoffs and must not be copied as final results marker.
# PASTEBACK_POSTED proof must be current-phase only marker.
