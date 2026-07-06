param(
  [ValidateSet("Enable","Disable","Status","StartNow")]
  [string]$Mode = "Status",
  [string]$RepoRoot = (Resolve-Path ".").Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

$TaskName = "SERA AutoOps Command Inbox Watcher"
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$AutoOpsRoot = [IO.Path]::GetFullPath($AutoOpsRoot)
$Control = Join-Path $AutoOpsRoot "00_control_center"
$Inbox = Join-Path $Control "command_inbox"
$LogDir = Join-Path $Control "auto_watcher_logs"
$Launcher = Join-Path $RepoRoot "SERA_START_WATCHER_NOW.ps1"

New-Item -ItemType Directory -Force $Inbox | Out-Null
New-Item -ItemType Directory -Force $LogDir | Out-Null

function Write-Step {
  param([string]$Message)
  Write-Host ("{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message)
}

function Get-CurrentUserId {
  if ($env:USERDOMAIN -and $env:USERNAME) {
    return "$env:USERDOMAIN\$env:USERNAME"
  }
  return [Security.Principal.WindowsIdentity]::GetCurrent().Name
}

function Get-TaskSafe {
  try {
    return Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
  } catch {
    return $null
  }
}

function Write-Status {
  $Task = Get-TaskSafe
  Write-Step "AUTO_WATCHER_STATUS"
  Write-Host "TaskName: $TaskName"
  Write-Host "RepoRoot: $RepoRoot"
  Write-Host "AutoOpsRoot: $AutoOpsRoot"
  Write-Host "CommandInbox: $Inbox"
  Write-Host "Launcher: $Launcher"
  Write-Host "LogDir: $LogDir"

  if (!$Task) {
    Write-Host "TaskExists: False"
  } else {
    Write-Host "TaskExists: True"
    Write-Host "TaskState: $($Task.State)"
    Write-Host "PrincipalUserId: $($Task.Principal.UserId)"
    Write-Host "PrincipalLogonType: $($Task.Principal.LogonType)"
    Write-Host "PrincipalRunLevel: $($Task.Principal.RunLevel)"
    try {
      $Info = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction Stop
      Write-Host "LastRunTime: $($Info.LastRunTime)"
      Write-Host "LastTaskResult: $($Info.LastTaskResult)"
      Write-Host "NextRunTime: $($Info.NextRunTime)"
    } catch {
      Write-Host "TaskInfo: unavailable: $($_.Exception.Message)"
    }
  }

  $RecentLogs = Get-ChildItem $LogDir -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 5

  Write-Host "RecentAutoWatcherLogs:"
  foreach ($Log in $RecentLogs) {
    Write-Host "- $($Log.FullName)"
  }
}

if ($Mode -eq "Enable") {
  if (!(Test-Path $Launcher)) {
    throw "Launcher script missing: $Launcher"
  }

  $UserId = Get-CurrentUserId
  $TaskArgs = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", ('"' + $Launcher + '"'),
    "-RepoRoot", ('"' + $RepoRoot + '"'),
    "-AutoOpsRoot", ('"' + $AutoOpsRoot + '"'),
    "-FromScheduledTask"
  )

  if ($LaunchBrowserIfNeeded) {
    $TaskArgs += "-LaunchBrowserIfNeeded"
  }

  $Argument = $TaskArgs -join " "

  $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $Argument
  $Trigger = New-ScheduledTaskTrigger -AtLogOn
  $Principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel LeastPrivilege
  $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)

  $Description = "S.E.R.A. AutoOps command inbox watcher. Explicit opt-in current-user logon task. No credentials, no SYSTEM, no service."

  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description $Description -Force | Out-Null

  Write-Step "AUTO_WATCHER_TASK_ENABLED"
  Write-Host "TaskName: $TaskName"
  Write-Host "UserId: $UserId"
  Write-Host "RunLevel: LeastPrivilege"
  Write-Host "LogonType: Interactive"
  Write-Host "Action: powershell.exe $Argument"
  Write-Host "CommandInbox: $Inbox"
  Write-Host "Disable: SERA_DISABLE_AUTO_WATCHER.ps1"
  exit 0
}

if ($Mode -eq "Disable") {
  $Task = Get-TaskSafe
  if ($Task) {
    try { Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue } catch {}
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Step "AUTO_WATCHER_TASK_DISABLED"
  } else {
    Write-Step "AUTO_WATCHER_TASK_NOT_FOUND_ALREADY_DISABLED"
  }
  exit 0
}

if ($Mode -eq "StartNow") {
  $Task = Get-TaskSafe
  if ($Task) {
    Start-ScheduledTask -TaskName $TaskName
    Write-Step "AUTO_WATCHER_TASK_STARTED_NOW"
  } else {
    Write-Step "AUTO_WATCHER_TASK_NOT_FOUND_STARTING_LAUNCHER_DIRECTLY"
    $Args = @("-RepoRoot", $RepoRoot, "-AutoOpsRoot", $AutoOpsRoot)
    if ($LaunchBrowserIfNeeded) { $Args += "-LaunchBrowserIfNeeded" }
    & powershell -NoProfile -ExecutionPolicy Bypass -File $Launcher @Args
    exit $LASTEXITCODE
  }
  exit 0
}

if ($Mode -eq "Status") {
  Write-Status
  exit 0
}
# PHASE183_MARKER: single-instance
# PHASE183_MARKER: No Windows service is created
# PHASE183_MARKER: No stored secrets

