param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$Phase = 0,
  [string]$PhaseToken = "",
  [string]$PhaseName = "",
  [string]$Branch = "",
  [string]$ExpectedZip = "",
  [string]$ExpectedSha256 = "",
  [string]$Verifier = "",
  [string]$QaScript = "",
  [string]$TagName = "",
  [int]$ApplyWaitMinutes = 20,
  [int]$CloseoutWaitMinutes = 20,
  [switch]$NoCloseout,
  [switch]$NoClipboard
)

$ErrorActionPreference = "Stop"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$ApplyApproved = Join-Path $AutoOpsRoot "01_apply_approved"
$Processing = Join-Path $AutoOpsRoot "08_processing"
$MergePending = Join-Path $AutoOpsRoot "09_merge_pending"
$MergeApproved = Join-Path $AutoOpsRoot "03_merge_approved"
$Blocked = Join-Path $AutoOpsRoot "05_blocked"
$RunnerVbs = Join-Path $Control "task_launchers_hidden\SERA_AutoOps_Runner-action1.vbs"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$LogDir = Join-Path $Control "production_watchers"
$Log = Join-Path $LogDir ("json-to-closed-cleanly-orchestrator-{0}-{1}.log" -f $PhaseToken,$Stamp)

New-Item -ItemType Directory -Force $Control,$Handoff,$Downloads13,$ApplyApproved,$Processing,$MergePending,$MergeApproved,$Blocked,$LogDir | Out-Null

function Write-Step {
  param([string]$Message)
  $Line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -Path $Log -Value $Line -Encoding UTF8
  Write-Host $Line
}

function Copy-TextForOwner {
  param([string]$Text)
  if (!$NoClipboard) {
    $Text | Set-Content (Join-Path $Control "CURRENT_CHATGPT_HANDOFF.md") -Encoding UTF8
    Set-Clipboard $Text
  }
}

function Run-ProcessSafe {
  param([string]$Label,[string]$FilePath,[string[]]$ArgumentVector,[string]$WorkingDirectory = $RepoRoot)
  foreach ($Item in $ArgumentVector) {
    if ($null -eq $Item -or [string]::IsNullOrWhiteSpace([string]$Item)) { throw "$Label received empty/null argument item." }
  }
  Write-Step "RUN: $Label"
  Write-Step "$FilePath $($ArgumentVector -join ' ')"
  $SafeLabel = $Label -replace '[^a-zA-Z0-9_-]','_'
  $OutFile = Join-Path $LogDir "$SafeLabel-$Stamp.stdout.log"
  $ErrFile = Join-Path $LogDir "$SafeLabel-$Stamp.stderr.log"
  Remove-Item $OutFile,$ErrFile -Force -ErrorAction SilentlyContinue
  $Proc = Start-Process -FilePath $FilePath -ArgumentList $ArgumentVector -WorkingDirectory $WorkingDirectory -Wait -PassThru -RedirectStandardOutput $OutFile -RedirectStandardError $ErrFile
  $Stdout = if (Test-Path $OutFile) { Get-Content $OutFile -Raw } else { "" }
  $Stderr = if (Test-Path $ErrFile) { Get-Content $ErrFile -Raw } else { "" }
  if ($Stdout) { Add-Content -Path $Log -Value $Stdout -Encoding UTF8; Write-Host $Stdout }
  if ($Stderr) { Add-Content -Path $Log -Value $Stderr -Encoding UTF8; Write-Host $Stderr }
  if ($Proc.ExitCode -ne 0) { throw "$Label failed with exit $($Proc.ExitCode)" }
}

function Run-GitSafe { param([string[]]$ArgumentVector) Run-ProcessSafe -Label ("git " + $ArgumentVector[0]) -FilePath "git" -ArgumentVector $ArgumentVector }

function Start-AutoOpsRunner {
  if (Test-Path -LiteralPath $RunnerVbs) {
    Write-Step "Starting AutoOps runner VBS: $RunnerVbs"
    Start-Process -FilePath "wscript.exe" -ArgumentList ('"' + $RunnerVbs + '"') -WindowStyle Hidden | Out-Null
  } else {
    Write-Step "Runner VBS missing. Trying scheduled task: SERA AutoOps Runner"
    Enable-ScheduledTask -TaskName "SERA AutoOps Runner" -ErrorAction SilentlyContinue | Out-Null
    Start-ScheduledTask -TaskName "SERA AutoOps Runner" -ErrorAction Stop
  }
}

function Get-PhasePacket {
  param([datetime]$StartUtc,[string[]]$AllowedStatuses)
  $Candidates = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*$PhaseToken*" -and $_.LastWriteTimeUtc -ge $StartUtc.AddMinutes(-1) } |
    Sort-Object LastWriteTime -Descending
  foreach ($File in $Candidates) {
    $Text = Get-Content $File.FullName -Raw -ErrorAction SilentlyContinue
    foreach ($Status in $AllowedStatuses) {
      if ($Text -like "*Status: $Status*" -and ($Text -like "*$PhaseName*" -or $Text -like "*$PhaseToken*")) {
        return [pscustomobject]@{ Status = $Status; File = $File; Text = $Text }
      }
    }
  }
  return $null
}

function Wait-ForPhasePacket {
  param([datetime]$StartUtc,[int]$Minutes,[string]$Label,[string[]]$AllowedStatuses)
  $Deadline = (Get-Date).AddMinutes($Minutes)
  $Tick = 0
  while ((Get-Date) -lt $Deadline) {
    $Packet = Get-PhasePacket -StartUtc $StartUtc -AllowedStatuses $AllowedStatuses
    if ($Packet) { return $Packet }
    $Tick += 1
    if (($Tick % 3) -eq 0) {
      $LatestHandoff = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$PhaseToken*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      $LatestProcessing = Get-ChildItem $Processing -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -like "*$PhaseToken*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      Write-Step "WAITING [$Label] latestHandoff=$($LatestHandoff.FullName) latestProcessing=$($LatestProcessing.FullName)"
    }
    Start-Sleep -Seconds 10
  }
  return $null
}

function Require-ParameterText { param([string]$Name,[string]$Value) if ([string]::IsNullOrWhiteSpace($Value)) { throw "Missing required parameter: $Name" } }

Require-ParameterText "PhaseToken" $PhaseToken
Require-ParameterText "PhaseName" $PhaseName
Require-ParameterText "Branch" $Branch
Require-ParameterText "ExpectedZip" $ExpectedZip
Require-ParameterText "Verifier" $Verifier
Require-ParameterText "QaScript" $QaScript

Write-Step "JSON_TO_CLOSED_CLEANLY_ORCHESTRATOR_START phase=$Phase token=$PhaseToken"

cd $RepoRoot
$ZipPath = Join-Path $Downloads13 $ExpectedZip
$ApplyZipPath = Join-Path $ApplyApproved $ExpectedZip
if (!(Test-Path -LiteralPath $ZipPath)) { throw "Expected ZIP missing: $ZipPath" }
if (![string]::IsNullOrWhiteSpace($ExpectedSha256)) {
  $ActualSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $ZipPath).Hash.ToLowerInvariant()
  Write-Step "ZIP SHA256: $ActualSha"
  if ($ActualSha -ne $ExpectedSha256.ToLowerInvariant()) { throw "ZIP SHA256 mismatch. Expected $ExpectedSha256 but got $ActualSha" }
}

$RequestPath = Join-Path $Control "artifact-watch-request.json"
if (!(Test-Path -LiteralPath $RequestPath)) { throw "artifact-watch-request.json missing." }
$Request = Get-Content -LiteralPath $RequestPath -Raw | ConvertFrom-Json
if ([string]$Request.phase -ne [string]$Phase) { throw "artifact-watch-request phase mismatch." }
if ([string]$Request.expectedZipName -ne $ExpectedZip) { throw "artifact-watch-request expectedZipName mismatch." }

Run-GitSafe @("fetch","origin","--tags")
Run-GitSafe @("switch","main")
Run-GitSafe @("reset","--hard","origin/main")
$RepoStatus = git status --porcelain
if ($RepoStatus) { git status; throw "Repo is not clean before apply." }

if (Test-Path -LiteralPath $ApplyZipPath) {
  $Archive = Join-Path $Control ("archive\orchestrator-$PhaseToken-$Stamp")
  New-Item -ItemType Directory -Force $Archive | Out-Null
  Move-Item $ApplyZipPath (Join-Path $Archive $ExpectedZip) -Force
  Write-Step "Archived older apply-approved ZIP."
}

# ZIP_READY_FOR_APPLY -> 01_apply_approved
Copy-Item $ZipPath $ApplyZipPath -Force
Write-Step "ZIP_READY_FOR_APPLY queued exact ZIP into 01_apply_approved: $ApplyZipPath"

$ApplyStartUtc = (Get-Date).ToUniversalTime()
Start-AutoOpsRunner
Write-Step "Waiting for apply packet."
$ApplyPacket = Wait-ForPhasePacket -StartUtc $ApplyStartUtc -Minutes $ApplyWaitMinutes -Label "apply" -AllowedStatuses @("BLOCKED","PASS","PASS_GUARANTEED","CLOSED_CLEANLY")
if (!$ApplyPacket) { throw "No fresh $PhaseToken apply handoff appeared." }
Write-Step "Apply packet: $($ApplyPacket.Status) :: $($ApplyPacket.File.FullName)"
if ($ApplyPacket.Status -eq "BLOCKED") { Copy-TextForOwner $ApplyPacket.Text; throw "$PhaseToken apply BLOCKED: $($ApplyPacket.File.FullName)" }
if ($ApplyPacket.Status -eq "CLOSED_CLEANLY") { Copy-TextForOwner $ApplyPacket.Text; Write-Host "CLOSED_CLEANLY: $($ApplyPacket.File.FullName)"; exit 0 }

$VerifierPath = Join-Path $RepoRoot $Verifier
$QaPath = Join-Path $RepoRoot $QaScript
if (!(Test-Path -LiteralPath $VerifierPath)) { throw "Verifier missing after apply: $VerifierPath" }
if (!(Test-Path -LiteralPath $QaPath)) { throw "QA script missing after apply: $QaPath" }

Run-GitSafe @("fetch","origin")
$SwitchWorked = $false
try { Run-GitSafe @("switch",$Branch); $SwitchWorked = $true } catch { Write-Step "Direct branch switch failed. Trying tracking branch." }
if (!$SwitchWorked) { Run-GitSafe @("switch","-c",$Branch,"--track","origin/$Branch") }

Run-ProcessSafe -Label "$PhaseToken verifier" -FilePath "powershell.exe" -ArgumentVector @("-NoProfile","-ExecutionPolicy","Bypass","-File",$VerifierPath,"-RepoRoot",$RepoRoot,"-AutoOpsRoot",$AutoOpsRoot)
Run-ProcessSafe -Label "$PhaseToken qa guarantee" -FilePath "powershell.exe" -ArgumentVector @("-NoProfile","-ExecutionPolicy","Bypass","-File",$QaPath,"-RepoRoot",$RepoRoot,"-AutoOpsRoot",$AutoOpsRoot,"-PhaseName",$PhaseName,"-Branch",$Branch,"-Verifier",$Verifier)

$Guaranteed = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$PhaseToken*" -and $_.Name -like "*PASS_GUARANTEED.md" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (!$Guaranteed) { throw "No $PhaseToken PASS_GUARANTEED handoff found after QA." }
$GuaranteedText = Get-Content $Guaranteed.FullName -Raw
if ($GuaranteedText -notlike "*Status: PASS_GUARANTEED*" -or $GuaranteedText -notlike "*$PhaseName*") { throw "$PhaseToken PASS_GUARANTEED validation failed." }
Copy-TextForOwner $GuaranteedText
Write-Step "Confirmed PASS_GUARANTEED: $($Guaranteed.FullName)"

$Pending = Get-ChildItem $MergePending -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$PhaseToken*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$Approved = Get-ChildItem $MergeApproved -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*$PhaseToken*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($Pending) {
  $ApprovedPath = Join-Path $MergeApproved $Pending.Name
  Move-Item $Pending.FullName $ApprovedPath -Force
  Write-Step "SAFE_AUTO_MERGE_AFTER_PASS_GUARANTEED moved MERGE_PENDING to MERGE_APPROVED: $ApprovedPath"
} elseif ($Approved) {
  Write-Step "MERGE_APPROVED already present: $($Approved.FullName)"
} else {
  throw "No $PhaseToken MERGE_PENDING or MERGE_APPROVED file found."
}

if ($NoCloseout) { Write-Step "NoCloseout set. Stopping after PASS_GUARANTEED and merge approval."; exit 0 }

Run-GitSafe @("fetch","origin")
Run-GitSafe @("switch","main")
Run-GitSafe @("reset","--hard","origin/main")
$CloseStartUtc = (Get-Date).ToUniversalTime()
Start-AutoOpsRunner
Write-Step "WAIT_ONLY_CLOSED: waiting for CLOSED_CLEANLY and ignoring PASS/PASS_GUARANTEED."
$ClosedPacket = Wait-ForPhasePacket -StartUtc $CloseStartUtc -Minutes $CloseoutWaitMinutes -Label "closeout" -AllowedStatuses @("BLOCKED","CLOSED_CLEANLY")
if (!$ClosedPacket) { throw "No fresh $PhaseToken CLOSED_CLEANLY handoff appeared." }
if ($ClosedPacket.Status -eq "BLOCKED") { Copy-TextForOwner $ClosedPacket.Text; throw "$PhaseToken closeout BLOCKED: $($ClosedPacket.File.FullName)" }
Copy-TextForOwner $ClosedPacket.Text
Run-GitSafe @("fetch","origin","--tags")
Run-GitSafe @("switch","main")
Run-GitSafe @("pull","origin","main")
Write-Host ""
Write-Host "=== $($PhaseToken.ToUpperInvariant()) CLOSED_CLEANLY CONFIRMED ==="
Write-Host $ClosedPacket.File.FullName
Write-Host "Final handoff copied to clipboard."
Write-Host "Log:"
Write-Host $Log
exit 0
