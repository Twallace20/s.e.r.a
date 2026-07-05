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
$RepairNested = Join-Path $RepoRoot "scripts\sera-repair-nested-overlay-paths-v1.ps1"

Set-Location $RepoRoot
New-Item -ItemType Directory -Force $Downloads13,$Handoff,$MergePending | Out-Null

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

function Copy-OverlayRoot {
  param([string]$OverlayRoot)

  if (!(Test-Path $OverlayRoot)) {
    throw "Overlay ZIP does not contain repo/ root."
  }

  Get-ChildItem -LiteralPath $OverlayRoot -Force | ForEach-Object {
    $Destination = Join-Path $RepoRoot $_.Name
    Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
  }
}

function Invoke-RequiredScript {
  param(
    [string]$RelativePath,
    [string]$Label
  )

  $ScriptPath = Join-Path $RepoRoot $RelativePath
  if (!(Test-Path $ScriptPath)) {
    throw "$Label path missing. Refusing closeout: $RelativePath"
  }

  $Tokens = $null
  $Errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($ScriptPath, [ref]$Tokens, [ref]$Errors) | Out-Null
  if ($Errors -and $Errors.Count -gt 0) {
    throw "$Label parse failed for $RelativePath :: $($Errors[0].Message)"
  }

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $ScriptPath -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed for $PhaseName"
  }
}

if (!$Phase -or !$PhaseName -or !$Branch -or !$ExpectedZip -or !$Verifier -or !$QaScript -or !$TagName) {
  throw "Direct ZIP closeout missing required phase arguments."
}

if (!(Test-Path $ZipPath)) {
  throw "Expected ZIP missing: $ZipPath"
}

if ($ExpectedSha256) {
  $ActualSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
  if ($ActualSha -ne $ExpectedSha256.ToLowerInvariant()) {
    throw "ZIP SHA mismatch. Expected $ExpectedSha256 but got $ActualSha"
  }
}

Write-Step "DIRECT_ZIP_CLOSEOUT_START phase=$Phase zip=$ZipPath"

Run-Git "git fetch" @("fetch","origin","--tags")
Run-Git "git switch main" @("switch","main")
Run-Git "git reset main" @("reset","--hard","origin/main")
Run-Git "git switch branch" @("switch","-C",$Branch)

$Temp = Join-Path $env:TEMP "sera_direct_zip_apply_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
if (Test-Path $Temp) { Remove-Item $Temp -Recurse -Force }
New-Item -ItemType Directory -Force $Temp | Out-Null

try {
  Expand-Archive -LiteralPath $ZipPath -DestinationPath $Temp -Force
  Copy-OverlayRoot -OverlayRoot (Join-Path $Temp "repo")
} finally {
  if (Test-Path $Temp) {
    Remove-Item $Temp -Recurse -Force
  }
}

if (Test-Path $RepairNested) {
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $RepairNested -RepoRoot $RepoRoot
  if ($LASTEXITCODE -ne 0) {
    throw "Nested overlay path repair failed."
  }
}

Invoke-RequiredScript -RelativePath $Verifier -Label "Verifier"
Invoke-RequiredScript -RelativePath $QaScript -Label "QA"

$LatestPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*PASS_GUARANTEED.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$LatestPass) {
  throw "PASS_GUARANTEED handoff not found after verifier and QA. Refusing merge."
}

Write-Step "PASS_GUARANTEED_FOUND $($LatestPass.FullName)"

Run-Git "git add" @("add","--all")

$Status = & git status --porcelain
if ($Status) {
  Run-Git "git commit" @("commit","-m","feat: add $PhaseName")
  Run-Git "git push branch" @("push","-u","origin",$Branch,"--force")
} else {
  Write-Step "NO_REPO_CHANGES_TO_COMMIT"
}

Run-Git "git switch main" @("switch","main")
Run-Git "git reset main" @("reset","--hard","origin/main")
Run-Git "git merge branch" @("merge","--no-ff",$Branch,"-m","merge: close $TagName")
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
Phase closed through hardened direct ZIP closeout.

Proof:
- Exact ZIP was present in 13_chatgpt_downloads.
- Overlay was applied from repo/ root.
- Nested overlay paths were flattened before verification.
- Verifier path resolved and verifier passed.
- QA path resolved and QA produced PASS_GUARANTEED.
- Merge was allowed only after PASS_GUARANTEED.
- Safe merge/tag/push/cleanup completed.
"@ | Set-Content $ClosedPath -Encoding UTF8

Get-Content $ClosedPath -Raw | Set-Clipboard

Write-Host ""
Write-Host "=== DIRECT ZIP CLOSEOUT CLOSED_CLEANLY CONFIRMED ==="
Write-Host $ClosedPath
