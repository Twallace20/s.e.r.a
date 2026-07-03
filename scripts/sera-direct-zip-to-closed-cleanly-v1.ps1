param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
  [Parameter(Mandatory=$true)][int]$Phase,
  [Parameter(Mandatory=$true)][string]$PhaseToken,
  [Parameter(Mandatory=$true)][string]$PhaseName,
  [Parameter(Mandatory=$true)][string]$Branch,
  [Parameter(Mandatory=$true)][string]$ExpectedZip,
  [string]$ExpectedSha256 = "",
  [Parameter(Mandatory=$true)][string]$Verifier,
  [Parameter(Mandatory=$true)][string]$QaScript,
  [Parameter(Mandatory=$true)][string]$TagName
)

$ErrorActionPreference = "Stop"
$Control = Join-Path $AutoOpsRoot "00_control_center"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$MergeApproved = Join-Path $AutoOpsRoot "03_merge_approved"
$Completed = Join-Path $AutoOpsRoot "04_completed"
$Processing = Join-Path $AutoOpsRoot "08_processing"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogDir = Join-Path $Control "production_watchers"
$Log = Join-Path $LogDir "direct-zip-to-closed-cleanly-phase$Phase-$Stamp.log"
New-Item -ItemType Directory -Force $LogDir,$Handoff,$MergePending,$MergeApproved,$Completed,$Processing | Out-Null

function Write-Step {
  param([string]$Message)
  $Line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $Log -Value $Line -Encoding UTF8
  Write-Host $Line
}

function Run-CmdGit {
  param([string]$Command,[switch]$AllowFailure)
  Write-Step "RUN: $Command"
  $OutFile = Join-Path $LogDir "cmd-git-$Phase-$Stamp.stdout.log"
  $ErrFile = Join-Path $LogDir "cmd-git-$Phase-$Stamp.stderr.log"
  Remove-Item $OutFile,$ErrFile -Force -ErrorAction SilentlyContinue
  $Proc = Start-Process -FilePath "cmd.exe" -ArgumentList @("/d","/c",$Command) -WorkingDirectory $RepoRoot -Wait -PassThru -RedirectStandardOutput $OutFile -RedirectStandardError $ErrFile
  $Stdout = if (Test-Path $OutFile) { Get-Content $OutFile -Raw } else { "" }
  $Stderr = if (Test-Path $ErrFile) { Get-Content $ErrFile -Raw } else { "" }
  if ($Stdout) { Add-Content $Log $Stdout -Encoding UTF8; Write-Host $Stdout }
  if ($Stderr) { Add-Content $Log $Stderr -Encoding UTF8; Write-Host $Stderr }
  if ($Proc.ExitCode -ne 0 -and !$AllowFailure) { throw "Command failed with exit $($Proc.ExitCode): $Command" }
  return $Proc.ExitCode
}

function Run-ProcessSafe {
  param([string]$Label,[string]$FilePath,[string[]]$ArgumentVector)
  Write-Step "RUN: $Label"
  Write-Step "$FilePath $($ArgumentVector -join ' ')"
  $OutFile = Join-Path $LogDir "$($Label -replace '[^a-zA-Z0-9_-]','_')-$Stamp.stdout.log"
  $ErrFile = Join-Path $LogDir "$($Label -replace '[^a-zA-Z0-9_-]','_')-$Stamp.stderr.log"
  Remove-Item $OutFile,$ErrFile -Force -ErrorAction SilentlyContinue
  $Proc = Start-Process -FilePath $FilePath -ArgumentList $ArgumentVector -WorkingDirectory $RepoRoot -Wait -PassThru -RedirectStandardOutput $OutFile -RedirectStandardError $ErrFile
  $Stdout = if (Test-Path $OutFile) { Get-Content $OutFile -Raw } else { "" }
  $Stderr = if (Test-Path $ErrFile) { Get-Content $ErrFile -Raw } else { "" }
  if ($Stdout) { Add-Content $Log $Stdout -Encoding UTF8; Write-Host $Stdout }
  if ($Stderr) { Add-Content $Log $Stderr -Encoding UTF8; Write-Host $Stderr }
  if ($Proc.ExitCode -ne 0) { throw "$Label failed with exit $($Proc.ExitCode)" }
}

function Copy-OverlayContent {
  param([string]$ExtractedRepo)
  Get-ChildItem $ExtractedRepo -Force | ForEach-Object {
    $Destination = Join-Path $RepoRoot $_.Name
    if ($_.PSIsContainer) {
      Copy-Item $_.FullName $Destination -Recurse -Force
    } else {
      Copy-Item $_.FullName $Destination -Force
    }
  }
}

function Get-PassGuaranteed {
  $Candidates = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*$PhaseToken*" -and $_.Name -like "*PASS_GUARANTEED.md" } |
    Sort-Object LastWriteTime -Descending
  foreach ($File in $Candidates) {
    $Text = Get-Content $File.FullName -Raw -ErrorAction SilentlyContinue
    if ($Text -like "*Status: PASS_GUARANTEED*" -and $Text -like "*$PhaseName*" -and $Text -notlike "*QA_BLOCKED*") {
      return [pscustomobject]@{ File = $File; Text = $Text }
    }
  }
  return $null
}

Write-Step "DIRECT_ZIP_TO_CLOSED_CLEANLY_START phase=$Phase token=$PhaseToken"
$ZipPath = Join-Path $Downloads13 $ExpectedZip
if (!(Test-Path $ZipPath)) { throw "Expected ZIP missing: $ZipPath" }
$ActualSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
Write-Step "ZIP SHA256: $ActualSha"
if ($ExpectedSha256 -and $ActualSha -ne $ExpectedSha256.ToLowerInvariant()) { throw "ZIP SHA mismatch. Expected $ExpectedSha256 but got $ActualSha" }

cd $RepoRoot
Run-CmdGit "git fetch origin --tags"
Run-CmdGit "git switch main"
Run-CmdGit "git reset --hard origin/main"
$Status = git status --porcelain
if ($Status) { git status; throw "Repo is not clean on main before direct overlay apply." }

$WorkDir = Join-Path $Processing "$PhaseName-$Stamp-direct"
$ExtractDir = Join-Path $WorkDir "extracted"
New-Item -ItemType Directory -Force $ExtractDir | Out-Null
Expand-Archive -LiteralPath $ZipPath -DestinationPath $ExtractDir -Force
$ExtractedRepo = Join-Path $ExtractDir "repo"
if (!(Test-Path $ExtractedRepo)) { throw "ZIP root must contain repo/: $ZipPath" }

Run-CmdGit "git switch -C `"$Branch`""
Copy-OverlayContent -ExtractedRepo $ExtractedRepo
Run-CmdGit "git add --all"
$DiffCached = git diff --cached --name-only | Out-String
if (!$DiffCached.Trim()) { throw "Overlay produced no staged changes. Stop." }
Run-CmdGit "git commit -m `"feat: add $PhaseName`""
Run-CmdGit "git push -u origin `"$Branch`""

$PassFile = Join-Path $Handoff "$PhaseName-$Stamp-PASS.md"
@(
  "# S.E.R.A. AutoOps Packet",
  "",
  "Status: PASS",
  "Phase: $PhaseName",
  "Branch: $Branch",
  "Timestamp: $Stamp",
  "",
  "## Summary",
  "",
  "Overlay applied directly from exact ZIP without VBS.",
  "",
  "ZIP: $ZipPath",
  "SHA256: $ActualSha"
) | Set-Content $PassFile -Encoding UTF8
Write-Step "Apply packet: PASS :: $PassFile"

$VerifierPath = Join-Path $RepoRoot $Verifier
$QaPath = Join-Path $RepoRoot $QaScript
if (!(Test-Path $VerifierPath)) { throw "Verifier missing after overlay apply: $VerifierPath" }
if (!(Test-Path $QaPath)) { throw "QA script missing after overlay apply: $QaPath" }

Run-ProcessSafe -Label "phase$Phase verifier" -FilePath "powershell.exe" -ArgumentVector @("-NoProfile","-ExecutionPolicy","Bypass","-File",$VerifierPath,"-RepoRoot",$RepoRoot,"-AutoOpsRoot",$AutoOpsRoot)
Run-ProcessSafe -Label "phase$Phase qa guarantee" -FilePath "powershell.exe" -ArgumentVector @("-NoProfile","-ExecutionPolicy","Bypass","-File",$QaPath,"-RepoRoot",$RepoRoot,"-AutoOpsRoot",$AutoOpsRoot,"-PhaseName",$PhaseName,"-Branch",$Branch,"-Verifier",$Verifier)

$PassGuaranteed = Get-PassGuaranteed
if (!$PassGuaranteed) { throw "Expected PASS_GUARANTEED not found for $PhaseName" }
Write-Step "Confirmed PASS_GUARANTEED: $($PassGuaranteed.File.FullName)"

$Pending = Get-ChildItem $MergePending -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*$PhaseToken*" -or $_.Name -like "*$($PhaseName)*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1
if (!$Pending) { throw "No MERGE_PENDING found after QA Guarantee." }
$ApprovedPath = Join-Path $MergeApproved $Pending.Name
Move-Item $Pending.FullName $ApprovedPath -Force
Write-Step "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED moved MERGE_PENDING to MERGE_APPROVED: $ApprovedPath"

Run-CmdGit "git fetch origin --tags"
Run-CmdGit "git switch main"
Run-CmdGit "git reset --hard origin/main"
Run-CmdGit "git merge --no-ff `"$Branch`" -m `"merge: close $TagName`""
Run-CmdGit "git push origin main"
$ExistingTag = git tag --list $TagName
if (!$ExistingTag) { Run-CmdGit "git tag $TagName"; Run-CmdGit "git push origin $TagName" } else { Write-Step "Tag already exists: $TagName" }
Run-CmdGit "git push origin --delete `"$Branch`"" -AllowFailure
Run-CmdGit "git branch -D `"$Branch`"" -AllowFailure
if (Test-Path $ApprovedPath) { Move-Item $ApprovedPath (Join-Path $Completed (Split-Path $ApprovedPath -Leaf)) -Force }

Run-CmdGit "git fetch origin --tags"
Run-CmdGit "git switch main"
Run-CmdGit "git pull origin main"
$FinalStatus = git status --porcelain
if ($FinalStatus) { git status; throw "Final repo status is not clean." }

$ClosedFile = Join-Path $Handoff "$PhaseName-$Stamp-CLOSED_CLEANLY.md"
$Packet = @(
  "# S.E.R.A. AutoOps Packet",
  "",
  "Status: CLOSED_CLEANLY",
  "Phase: $PhaseName",
  "Branch: main",
  "Timestamp: $Stamp",
  "",
  "## Summary",
  "",
  "Direct ZIP-to-closeout completed without VBS. Main validated, pushed, tagged, work branch deleted, merge approval archived, and repo cleanup checks completed.",
  "",
  "## Evidence",
  "",
  "PASS_GUARANTEED: $($PassGuaranteed.File.FullName)",
  "Tag: $TagName",
  "Log: $Log"
)
$Packet | Set-Content $ClosedFile -Encoding UTF8
$PacketText = Get-Content $ClosedFile -Raw
$PacketText | Set-Content (Join-Path $Control "CURRENT_CHATGPT_HANDOFF.md") -Encoding UTF8
Set-Clipboard $PacketText
Write-Host ""
Write-Host "=== PHASE$Phase CLOSED_CLEANLY CONFIRMED ==="
Write-Host $ClosedFile
Write-Host "Final handoff copied to clipboard."
Write-Host "Log:"
Write-Host $Log
