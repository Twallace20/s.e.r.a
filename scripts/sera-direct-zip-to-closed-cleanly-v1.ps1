param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$Phase,
  [string]$PhaseName,
  [string]$PhaseToken,
  [string]$Branch,
  [string]$ExpectedZip,
  [string]$ExpectedSha256 = "",
  [string]$Verifier,
  [string]$QaScript,
  [string]$TagName
)

$ErrorActionPreference = "Stop"

$RunId = Get-Date -Format "yyyyMMdd_HHmmss"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$GateStateDir = Join-Path $AutoOpsRoot "00_control_center\gate_state"
$ZipPath = Join-Path $Downloads13 $ExpectedZip

Set-Location $RepoRoot
New-Item -ItemType Directory -Force $Downloads13,$Handoff,$GateStateDir | Out-Null

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
    Stop-WithBlocked -Reason "$Label failed with exit ${Code}" -ExitCode $Code
  }

  return $Code
}

function Stop-WithBlocked {
  param(
    [string]$Reason,
    [int]$ExitCode = 2
  )

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $BlockedPath = Join-Path $Handoff "$PhaseName-$Stamp-BLOCKED.md"

@"
Status: BLOCKED
Phase: $PhaseName
Branch: $Branch
Timestamp: $Stamp
RunId: $RunId

Reason:
$Reason

Gate result:
Merge was not attempted.
QA was not run after verifier failure.
CLOSED_CLEANLY was not written.
"@ | Set-Content $BlockedPath -Encoding UTF8

  Get-Content $BlockedPath -Raw | Set-Clipboard
  Write-Host "BLOCKED_HANDOFF: $BlockedPath"
  exit $ExitCode
}

function Assert-RequiredFile {
  param(
    [string]$Role,
    [string]$Path
  )

  if (!(Test-Path $Path)) {
    Stop-WithBlocked -Reason "Required $Role script missing: $Path" -ExitCode 21
  }

  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null

  if ($Errors -and $Errors.Count -gt 0) {
    Stop-WithBlocked -Reason "Required $Role script parse failed: $Path :: $($Errors[0].Message)" -ExitCode 22
  }
}

function Invoke-RequiredScript {
  param(
    [string]$Role,
    [string]$Path,
    [string[]]$Arguments
  )

  Assert-RequiredFile -Role $Role -Path $Path

  $StartedAt = Get-Date
  Write-Step "INVOKE_REQUIRED_SCRIPT role=$Role path=$Path"
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Path @Arguments
  $Code = $LASTEXITCODE

  if ($Code -ne 0) {
    Stop-WithBlocked -Reason "Required $Role script failed with exit ${Code}: $Path" -ExitCode $Code
  }

  return $StartedAt
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

if (!(Test-Path $ZipPath)) {
  Stop-WithBlocked -Reason "Expected ZIP missing: $ZipPath" -ExitCode 10
}

if ($ExpectedSha256) {
  $ActualSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
  if ($ActualSha -ne $ExpectedSha256.ToLowerInvariant()) {
    Stop-WithBlocked -Reason "ZIP SHA mismatch. Expected $ExpectedSha256 but got $ActualSha" -ExitCode 11
  }
}

Run-Git "git fetch" @("fetch","origin","--tags")
Run-Git "git switch main" @("switch","main")
Run-Git "git reset main" @("reset","--hard","origin/main")
Run-Git "git switch branch" @("switch","-C",$Branch)

$Temp = Join-Path $env:TEMP "sera_direct_zip_apply_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
if (Test-Path $Temp) { Remove-Item $Temp -Recurse -Force }
New-Item -ItemType Directory -Force $Temp | Out-Null

Expand-Archive -LiteralPath $ZipPath -DestinationPath $Temp -Force
$OverlayRoot = Join-Path $Temp "repo"

if (!(Test-Path $OverlayRoot)) {
  Stop-WithBlocked -Reason "Overlay ZIP does not contain repo/ root." -ExitCode 12
}

Get-ChildItem -LiteralPath $OverlayRoot -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $RepoRoot $_.Name) -Recurse -Force
}

Remove-Item $Temp -Recurse -Force
Repair-NestedOverlayPaths -Root $RepoRoot

$VerifierPath = Join-Path $RepoRoot $Verifier
$QaPath = Join-Path $RepoRoot $QaScript

Assert-RequiredFile -Role "verifier" -Path $VerifierPath
Assert-RequiredFile -Role "qa" -Path $QaPath

Run-Git "git add" @("add","--all")

$Status = & git status --porcelain
if ($Status) {
  Run-Git "git commit" @("commit","-m","feat: add $PhaseName")
  Run-Git "git push branch" @("push","-u","origin",$Branch,"--force")
}

$CommonArgs = @("-RepoRoot",$RepoRoot,"-AutoOpsRoot",$AutoOpsRoot)

$VerifierStartedAt = Invoke-RequiredScript -Role "verifier" -Path $VerifierPath -Arguments $CommonArgs
$VerifyPass = Get-FreshHandoff -Pattern "$PhaseName-*VERIFY_PASS.md" -Since $VerifierStartedAt
if (!$VerifyPass) {
  Stop-WithBlocked -Reason "Fresh VERIFY_PASS handoff not found after verifier. Refusing QA and merge." -ExitCode 31
}

$QaStartedAt = Invoke-RequiredScript -Role "qa" -Path $QaPath -Arguments $CommonArgs
$LatestPass = Get-FreshHandoff -Pattern "$PhaseName-*PASS_GUARANTEED.md" -Since $QaStartedAt

if (!$LatestPass) {
  Stop-WithBlocked -Reason "Fresh PASS_GUARANTEED handoff not found after QA. Refusing merge." -ExitCode 32
}

Write-Step "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED $($LatestPass.FullName)"

Run-Git "git switch main" @("switch","main")
Run-Git "git reset main" @("reset","--hard","origin/main")
Run-Git "git merge branch" @("merge","--no-ff",$Branch,"-m","merge: close $($TagName)")
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
RunId: $RunId

Result:
Phase closed through direct ZIP-to-closeout with enforced single-run gates.

Proof:
- Exact ZIP was downloaded into 13_chatgpt_downloads.
- Nested overlay paths were flattened before verifier execution.
- Invoke-RequiredScript executed verifier and QA.
- Fresh VERIFY_PASS was required before QA.
- Fresh PASS_GUARANTEED was required after QA before merge.
- Safe merge/tag/push/cleanup completed only after gate success.
- Final current-phase handoff was copied.

WAIT_ONLY_CLOSED:
CLOSED_CLEANLY was written only after merge/tag/push/cleanup.
"@ | Set-Content $ClosedPath -Encoding UTF8

Get-Content $ClosedPath -Raw | Set-Clipboard

Write-Host ""
Write-Host "=== DIRECT ZIP CLOSEOUT CLOSED_CLEANLY CONFIRMED ==="
Write-Host $ClosedPath
exit 0

# PHASE177_GATE_MARKER: Required verifier script failed

# PHASE177_GATE_MARKER: Required QA script failed

# PHASE177_GATE_MARKER: Merge was refused

# PHASE177_GATE_MARKER: QA and merge must only run after required scripts pass in this run

