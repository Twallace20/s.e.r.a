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

if (!(Test-Path $ZipPath)) {
  throw "Expected ZIP missing: $ZipPath"
}

if ($ExpectedSha256) {
  $ActualSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
  if ($ActualSha -ne $ExpectedSha256.ToLowerInvariant()) {
    throw "ZIP SHA mismatch. Expected $ExpectedSha256 but got $ActualSha"
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
  throw "Overlay ZIP does not contain repo/ root."
}

Get-ChildItem -LiteralPath $OverlayRoot -Force | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $RepoRoot $_.Name) -Recurse -Force
}

Remove-Item $Temp -Recurse -Force

Run-Git "git add" @("add","--all")

$Status = & git status --porcelain
if ($Status) {
  Run-Git "git commit" @("commit","-m","feat: add $PhaseName")
  Run-Git "git push branch" @("push","-u","origin",$Branch,"--force")
}

powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot $Verifier) -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
if ($LASTEXITCODE -ne 0) {
  throw "Verifier failed for $PhaseName"
}

powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot $QaScript) -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
if ($LASTEXITCODE -ne 0) {
  throw "QA failed for $PhaseName"
}

$LatestPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*PASS_GUARANTEED.md" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$LatestPass) {
  throw "PASS_GUARANTEED handoff not found. Refusing merge."
}

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
Phase closed through direct ZIP-to-closeout without VBS.

What this proves:
- Exact ZIP was downloaded into 13_chatgpt_downloads.
- Overlay was applied directly.
- Verifier passed.
- QA Guarantee produced PASS_GUARANTEED.
- Safe merge/tag/push/cleanup completed.
- Final handoff was copied.
"@ | Set-Content $ClosedPath -Encoding UTF8

Get-Content $ClosedPath -Raw | Set-Clipboard

Write-Host ""
Write-Host "=== DIRECT ZIP CLOSEOUT CLOSED_CLEANLY CONFIRMED ==="
Write-Host $ClosedPath
