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

$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$ZipPath = Join-Path $Downloads13 $ExpectedZip

Set-Location $RepoRoot
New-Item -ItemType Directory -Force $Downloads13,$Handoff,$MergePending | Out-Null

# SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED
# WAIT_ONLY_CLOSED
# Invoke-RequiredScript gate: required scripts cannot be skipped or ignored.

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

function Write-BlockedHandoff {
  param([string]$Reason)

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $BlockedPath = Join-Path $Handoff "$PhaseName-$Stamp-BLOCKED.md"

@"
Status: BLOCKED
Phase: $PhaseName
Branch: $Branch
Timestamp: $Stamp
Reason: $Reason

Gate result:
Merge was refused. QA and merge must only run after required scripts pass in this run.

Required invariant:
Verifier success -> QA success -> fresh PASS_GUARANTEED -> merge/tag/push -> CLOSED_CLEANLY.
"@ | Set-Content $BlockedPath -Encoding UTF8

  Get-Content $BlockedPath -Raw | Set-Clipboard
  Write-Host "BLOCKED_HANDOFF: $BlockedPath"
  return $BlockedPath
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

function Invoke-RequiredScript {
  param(
    [string]$Role,
    [string]$Path
  )

  if (!(Test-Path $Path)) {
    $Reason = "Required $Role script missing: $Path"
    Write-BlockedHandoff -Reason $Reason | Out-Null
    throw $Reason
  }

  $StartedAt = Get-Date
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') RUN_REQUIRED_SCRIPT role=$Role path=$Path"

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Path -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  $Code = $LASTEXITCODE
  $EndedAt = Get-Date

  if ($Code -ne 0) {
    $Reason = "Required $Role script failed with exit ${Code}: $Path"
    Write-BlockedHandoff -Reason $Reason | Out-Null
    throw $Reason
  }

  return [pscustomobject]@{
    Role = $Role
    Path = $Path
    StartedAt = $StartedAt
    EndedAt = $EndedAt
    ExitCode = $Code
  }
}

if (!(Test-Path $ZipPath)) {
  $Reason = "Expected ZIP missing: $ZipPath"
  Write-BlockedHandoff -Reason $Reason | Out-Null
  throw $Reason
}

if ($ExpectedSha256) {
  $ActualSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
  if ($ActualSha -ne $ExpectedSha256.ToLowerInvariant()) {
    $Reason = "ZIP SHA mismatch. Expected $ExpectedSha256 but got $ActualSha"
    Write-BlockedHandoff -Reason $Reason | Out-Null
    throw $Reason
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
  $Reason = "Overlay ZIP does not contain repo/ root."
  Write-BlockedHandoff -Reason $Reason | Out-Null
  throw $Reason
}

Get-ChildItem -LiteralPath $OverlayRoot -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $RepoRoot $_.Name) -Recurse -Force
}

Remove-Item $Temp -Recurse -Force
Repair-NestedOverlayPaths -Root $RepoRoot

$VerifierPath = Join-Path $RepoRoot $Verifier
$QaPath = Join-Path $RepoRoot $QaScript

if (!(Test-Path $VerifierPath)) {
  $Reason = "Verifier path missing after flattening: $VerifierPath"
  Write-BlockedHandoff -Reason $Reason | Out-Null
  throw $Reason
}

if (!(Test-Path $QaPath)) {
  $Reason = "QA path missing after flattening: $QaPath"
  Write-BlockedHandoff -Reason $Reason | Out-Null
  throw $Reason
}

Run-Git "git add" @("add","--all")

$Status = & git status --porcelain
if ($Status) {
  Run-Git "git commit" @("commit","-m","feat: add $PhaseName")
  Run-Git "git push branch" @("push","-u","origin",$Branch,"--force")
}

$VerifierRun = Invoke-RequiredScript -Role "verifier" -Path $VerifierPath
$QaRun = Invoke-RequiredScript -Role "qa" -Path $QaPath

$LatestPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*PASS_GUARANTEED.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge $QaRun.StartedAt.AddSeconds(-5) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$LatestPass) {
  $Reason = "Fresh PASS_GUARANTEED handoff not found after verifier and QA success. Refusing merge."
  Write-BlockedHandoff -Reason $Reason | Out-Null
  throw $Reason
}

# Merge is below the fresh PASS_GUARANTEED gate by design.
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

Result:
Phase closed through required-script gate integrity enforcement.

Proof:
- Exact ZIP was downloaded into 13_chatgpt_downloads.
- Nested overlay paths were flattened before verifier execution.
- Invoke-RequiredScript executed verifier and captured exit code.
- QA only ran after verifier success in the same run.
- Fresh PASS_GUARANTEED was required after QA success.
- SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED was honored.
- WAIT_ONLY_CLOSED was preserved.
- Safe merge/tag/push/cleanup completed only after the gate passed.
"@ | Set-Content $ClosedPath -Encoding UTF8

Get-Content $ClosedPath -Raw | Set-Clipboard

Write-Host ""
Write-Host "=== DIRECT ZIP CLOSEOUT CLOSED_CLEANLY CONFIRMED ==="
Write-Host $ClosedPath

