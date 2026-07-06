
param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",

  [Alias("Zip","OverlayZip","OverlayZipPath","ZipFullPath","ArtifactZip")]
  [AllowEmptyString()]
  [string]$ZipPath = "",

  [Alias("ExpectedZip","ExpectedZipFileName")]
  [AllowEmptyString()]
  [string]$ExpectedFilename = "",

  [int]$Phase = 0,
  [AllowEmptyString()]
  [string]$PhaseSlug = "",
  [AllowEmptyString()]
  [string]$PhaseName = "",
  [AllowEmptyString()]
  [string]$Branch = "",
  [AllowEmptyString()]
  [string]$TagName = "",
  [switch]$SavedChatGptTargetOnly,

  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$RemainingArguments
)

$ErrorActionPreference = "Stop"

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"

New-Item -ItemType Directory -Force $Downloads13 | Out-Null
New-Item -ItemType Directory -Force $Handoff | Out-Null

function Write-PhaseBlocked {
  param(
    [string]$Reason,
    [string]$PhaseNameValue
  )

  if ([string]::IsNullOrWhiteSpace($PhaseNameValue)) {
    if (![string]::IsNullOrWhiteSpace($PhaseSlug)) {
      $PhaseNameValue = "s.e.r.a_${PhaseSlug}_overlay"
    } else {
      $PhaseNameValue = "s.e.r.a_unknown_phase_overlay"
    }
  }

  if ([string]::IsNullOrWhiteSpace($Reason)) {
    $Reason = "Blocked with no reason. This is invalid."
  }

  if ($Reason -eq "ZIP missing:" -or $Reason -match "ZIP missing:\s*$") {
    $Reason = "ZIP missing: expectedFilename=$ExpectedFilename; searched=$Downloads13; suppliedZipPath='$ZipPath'"
  }

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $Path = Join-Path $Handoff "$PhaseNameValue-$Stamp-BLOCKED.md"

  @"
Status: BLOCKED
Phase: $PhaseNameValue
Branch: $Branch
Timestamp: $Stamp
Reason: $Reason

Gate result:
Merge was not attempted.
QA must not run after verifier failure.
CLOSED_CLEANLY was not written.

NO_EMPTY_ZIP_MISSING_REASON
"@ | Set-Content $Path -Encoding UTF8

  Write-Host "BLOCKED_HANDOFF: $Path"
  Get-Content $Path -Raw | Set-Clipboard
  exit 1
}

function Convert-SlugToKebab {
  param([string]$Value)
  return ($Value -replace "_","-")
}

function Resolve-ExpectedZipFilename {
  if (![string]::IsNullOrWhiteSpace($ExpectedFilename)) {
    return [IO.Path]::GetFileName($ExpectedFilename)
  }

  if (![string]::IsNullOrWhiteSpace($PhaseSlug)) {
    $Resolved = "s.e.r.a_${PhaseSlug}_overlay.zip"
    Write-Host "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME $Resolved"
    return $Resolved
  }

  if (![string]::IsNullOrWhiteSpace($PhaseName)) {
    $Clean = $PhaseName
    if ($Clean -notlike "*.zip") {
      $Clean = "$Clean.zip"
    }
    $Resolved = [IO.Path]::GetFileName($Clean)
    Write-Host "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME $Resolved"
    return $Resolved
  }

  Write-PhaseBlocked -PhaseNameValue $PhaseName -Reason "Expected ZIP filename could not be derived. suppliedZipPath='$ZipPath'; phaseSlug='$PhaseSlug'; phaseName='$PhaseName'; searched=$Downloads13"
}

function Resolve-ZipPathSafe {
  $Expected = Resolve-ExpectedZipFilename
  $Original = [string]$ZipPath

  if ([string]::IsNullOrWhiteSpace($Original)) {
    Write-Host "ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED expected=$Expected"
  }

  if (![string]::IsNullOrWhiteSpace($Original)) {
    $Expanded = [Environment]::ExpandEnvironmentVariables($Original)

    if ([IO.Path]::IsPathRooted($Expanded)) {
      if (Test-Path -LiteralPath $Expanded) {
        Write-Host "ZIP_PATH_RESOLVED_FROM_ARGUMENT $Expanded"
        return (Get-Item -LiteralPath $Expanded).FullName
      }
    } else {
      $Candidate = Join-Path $Downloads13 ([IO.Path]::GetFileName($Expanded))
      if (Test-Path -LiteralPath $Candidate) {
        Write-Host "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13 $Candidate"
        return (Get-Item -LiteralPath $Candidate).FullName
      }
    }
  }

  $ExactCandidate = Join-Path $Downloads13 $Expected
  if (Test-Path -LiteralPath $ExactCandidate) {
    Write-Host "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME $Expected"
    Write-Host "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13 $ExactCandidate"
    return (Get-Item -LiteralPath $ExactCandidate).FullName
  }

  $Fresh = Get-ChildItem -LiteralPath $Downloads13 -File -Filter $Expected -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($Fresh) {
    Write-Host "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME $Expected"
    Write-Host "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13 $($Fresh.FullName)"
    return $Fresh.FullName
  }

  Write-PhaseBlocked -PhaseNameValue $PhaseName -Reason "ZIP missing: expectedFilename=$Expected; searched=$Downloads13; suppliedZipPath='$Original'; phaseSlug='$PhaseSlug'"
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
      Write-Host "FLATTENED $($Pair.Nested)\$($_.Name) -> $($Pair.Target)\$($_.Name)"
    }

    Remove-Item $NestedPath -Recurse -Force
  }
}

function Copy-OverlayZipIntoRepo {
  param([string]$ZipFullPath)

  if (!(Test-Path -LiteralPath $ZipFullPath)) {
    Write-PhaseBlocked -PhaseNameValue $PhaseName -Reason "Overlay ZIP missing after resolution: expectedFilename=$ExpectedFilename; resolvedZipPath='$ZipFullPath'; searched=$Downloads13"
  }

  $Temp = Join-Path $env:TEMP "sera_phase185_direct_closeout_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
  Remove-Item -Recurse -Force $Temp -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force $Temp | Out-Null

  Expand-Archive -LiteralPath $ZipFullPath -DestinationPath $Temp -Force

  $OverlayRoot = Join-Path $Temp "repo"
  if (!(Test-Path $OverlayRoot)) {
    Write-PhaseBlocked -PhaseNameValue $PhaseName -Reason "Overlay ZIP does not contain repo/ root: $ZipFullPath"
  }

  Get-ChildItem -LiteralPath $OverlayRoot -Force | ForEach-Object {
    $Destination = Join-Path $RepoRoot $_.Name

    if ($_.PSIsContainer) {
      New-Item -ItemType Directory -Force $Destination | Out-Null
      Get-ChildItem -LiteralPath $_.FullName -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $Destination $_.Name) -Recurse -Force
      }
    } else {
      Copy-Item -LiteralPath $_.FullName -Destination $Destination -Force
    }
  }

  Remove-Item $Temp -Recurse -Force
  Repair-NestedOverlayPaths -Root $RepoRoot
}

function Run-Git {
  param(
    [string]$Label,
    [string[]]$ArgList,
    [switch]$AllowFail
  )

  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') RUN: git $($ArgList -join ' ')"
  & git @ArgList
  $Code = $LASTEXITCODE

  if ($Code -ne 0 -and -not $AllowFail) {
    throw "$Label failed with exit $Code"
  }

  return $Code
}

function Assert-ParseOk {
  param([string]$Path)

  if (!(Test-Path $Path)) {
    throw "Missing required file: $Path"
  }

  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null

  if ($Errors -and $Errors.Count -gt 0) {
    throw "Parse failed: $Path :: $($Errors[0].Message)"
  }
}

function Invoke-PastebackTextMatchRequired {
  param([string]$ClosedPath)

  $Pasteback = Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1"
  Assert-ParseOk $Pasteback

  $PasteStartedAt = Get-Date
  $Expected = Resolve-ExpectedZipFilename

  powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Pasteback `
    -RepoRoot $RepoRoot `
    -AutoOpsRoot $AutoOpsRoot `
    -HandoffPath $ClosedPath `
    -PhaseSlug $PhaseSlug `
    -ExpectedFilename $Expected `
    -SavedChatGptTargetOnly

  if ($LASTEXITCODE -ne 0) {
    throw "Pasteback helper failed with exit $LASTEXITCODE. Merge was not run."
  }

  $PhaseNameValue = if (![string]::IsNullOrWhiteSpace($PhaseName)) { $PhaseName } else { "s.e.r.a_${PhaseSlug}_overlay" }

  $Posted = Get-ChildItem $Handoff -File -Filter "$PhaseNameValue-*PASTEBACK_POSTED_TEXT_MATCH.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $PasteStartedAt.AddSeconds(-5) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$Posted) {
    throw "PASTEBACK_POSTED_TEXT_MATCH was not produced. Merge was not run."
  }

  Write-Host "PASTEBACK_POSTED_TEXT_MATCH_FOUND $($Posted.FullName)"
}

try {
  Set-Location $RepoRoot

  $ExpectedFilename = Resolve-ExpectedZipFilename
  $ResolvedZip = Resolve-ZipPathSafe

  if ([string]::IsNullOrWhiteSpace($PhaseSlug)) {
    $PhaseSlug = ([IO.Path]::GetFileNameWithoutExtension($ExpectedFilename) -replace "^s\.e\.r\.a_","" -replace "_overlay$","")
  }

  if ([string]::IsNullOrWhiteSpace($PhaseName)) {
    $PhaseName = "s.e.r.a_${PhaseSlug}_overlay"
  }

  if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = "work/" + ((Convert-SlugToKebab $PhaseSlug) -replace "^phase\d+-","phase$Phase-")
  }

  if ([string]::IsNullOrWhiteSpace($TagName)) {
    $TagName = (Convert-SlugToKebab $PhaseSlug)
  }

  $Verifier = Join-Path $RepoRoot ("scripts\verify-" + (Convert-SlugToKebab $PhaseSlug) + ".ps1")
  $QaScript = Join-Path $RepoRoot ("scripts\" + (Convert-SlugToKebab $PhaseSlug) + ".ps1")

  Run-Git "git fetch" @("fetch","origin","--tags")
  Run-Git "git switch main" @("switch","main")
  Run-Git "git reset main" @("reset","--hard","origin/main")
  Run-Git "git switch branch" @("switch","-C",$Branch)

  Copy-OverlayZipIntoRepo -ZipFullPath $ResolvedZip

  Run-Git "git add" @("add","--all")

  $Status = & git status --porcelain
  if ($Status) {
    Run-Git "git commit" @("commit","-m","fix: resolve blank zip path before direct closeout")
    Run-Git "git push branch" @("push","-u","origin",$Branch,"--force")
  }

  Assert-ParseOk $Verifier
  Assert-ParseOk $QaScript

  Write-Host "=== RUNNING VERIFIER ==="
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Verifier -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Verifier failed. QA and merge were not run."
  }

  Write-Host "=== RUNNING QA GUARANTEE ==="
  $QaStartedAt = Get-Date
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File $QaScript -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) {
    throw "QA failed. Merge was not run."
  }

  $LatestPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*PASS_GUARANTEED.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $QaStartedAt.AddSeconds(-5) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$LatestPass) {
    throw "Fresh PASS_GUARANTEED handoff not found after QA. Merge was not run."
  }

  $CloseStamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $ClosedPath = Join-Path $Handoff "$PhaseName-$CloseStamp-CLOSED_CLEANLY.md"

  @"
Status: CLOSED_CLEANLY
Phase: $PhaseName
Branch: main
Timestamp: $CloseStamp
Tag: $TagName

Result:
Phase185 closed cleanly after installing blank ZIP path recovery for direct closeout.

Proof:
- Direct closeout now resolves blank ZIP arguments from the exact expected filename.
- Direct closeout resolves filename-only arguments under 13_chatgpt_downloads.
- Direct closeout writes ZIP_PATH_ARGUMENT_WAS_BLANK_RECOVERED when recovery is needed.
- Direct closeout writes ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME and ZIP_PATH_RESOLVED_FROM_DOWNLOADS13.
- Direct closeout no longer writes a blank 'ZIP missing:' blocked reason.
- Verifier passed.
- QA produced fresh PASS_GUARANTEED.
- Final handoff was posted as plain text before merge.
- PASTEBACK_POSTED_TEXT_MATCH was required before safe merge/tag/push/cleanup.

Next proof:
The next phone-only phase should complete without manual rescue closeout.
"@ | Set-Content $ClosedPath -Encoding UTF8

  Get-Content $ClosedPath -Raw | Set-Clipboard
  Invoke-PastebackTextMatchRequired -ClosedPath $ClosedPath

  Run-Git "git switch main" @("switch","main")
  Run-Git "git reset main" @("reset","--hard","origin/main")
  Run-Git "git merge" @("merge","--no-ff",$Branch,"-m","merge: close phase-185-blank-zip-path-closeout-fix-v1")
  Run-Git "git tag" @("tag","-f",$TagName)
  Run-Git "git push main" @("push","origin","main")
  Run-Git "git push tag" @("push","origin",$TagName,"--force")
  Run-Git "git delete remote branch" @("push","origin",":$Branch") -AllowFail
  Run-Git "git delete local branch" @("branch","-D",$Branch) -AllowFail

  Write-Host "CLOSED_CLEANLY $ClosedPath"
  exit 0
} catch {
  Write-PhaseBlocked -PhaseNameValue $PhaseName -Reason $_.Exception.Message
}
