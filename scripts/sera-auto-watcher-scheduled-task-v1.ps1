param(
  [ValidateSet("Enable","Disable","Status","StartNow")]
  [string]$Mode = "Status",

  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",

  [switch]$LaunchBrowserIfNeeded
)

$ErrorActionPreference = "Stop"

$TaskName = "SERA AutoOps Command Inbox Watcher"
$Runner = Join-Path $RepoRoot "SERA_AUTO_WATCHER_RUNNER.ps1"
$Inbox = Join-Path $AutoOpsRoot "00_control_center\command_inbox"
$StartupFolder = [Environment]::GetFolderPath("Startup")
$StartupCmd = Join-Path $StartupFolder "SERA_AutoOps_Command_Inbox_Watcher.cmd"

function Assert-Runner {
  if (!(Test-Path $Runner)) {
    throw "Runner missing: $Runner"
  }

  if (!(Test-Path $Inbox)) {
    New-Item -ItemType Directory -Force $Inbox | Out-Null
  }

  if (!(Test-Path $StartupFolder)) {
    New-Item -ItemType Directory -Force $StartupFolder | Out-Null
  }
}

function Get-RunnerArgsText {
  $Parts = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$Runner`"",
    "-RepoRoot", "`"$RepoRoot`"",
    "-AutoOpsRoot", "`"$AutoOpsRoot`""
  )

  if ($LaunchBrowserIfNeeded) {
    $Parts += "-LaunchBrowserIfNeeded"
  }

  return ($Parts -join " ")
}

function Write-StartupFallback {
  Assert-Runner

  $ArgsText = Get-RunnerArgsText

  $Lines = @(
    "@echo off",
    "REM SERA AutoOps Command Inbox Watcher",
    "REM opt-in automatic watcher",
    "REM No Windows service is created",
    "REM No stored secrets",
    "start ""SERA AutoOps Watcher"" /min powershell.exe $ArgsText"
  )

  Set-Content -LiteralPath $StartupCmd -Value $Lines -Encoding ASCII

  Write-Host "STARTUP_FALLBACK_ENABLED $StartupCmd"
}

function Remove-StartupFallback {
  if (Test-Path $StartupCmd) {
    Remove-Item $StartupCmd -Force
    Write-Host "STARTUP_FALLBACK_REMOVED $StartupCmd"
  } else {
    Write-Host "STARTUP_FALLBACK_NOT_PRESENT $StartupCmd"
  }
}

function Try-RegisterTask {
  Assert-Runner

  $ArgsText = Get-RunnerArgsText
  $Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $ArgsText
  $Trigger = New-ScheduledTaskTrigger -AtLogOn
  $UserId = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
  $Principal = New-ScheduledTaskPrincipal -UserId $UserId -LogonType Interactive -RunLevel Limited
  $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew

  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description "SERA current-user command inbox watcher. Opt-in automatic watcher. No Windows service is created. No stored secrets." -Force | Out-Null

  Write-Host "SCHEDULED_TASK_ENABLED $TaskName"
}

function Try-UnregisterTask {
  try {
    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($Task) {
      Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
      Write-Host "SCHEDULED_TASK_REMOVED $TaskName"
    } else {
      Write-Host "SCHEDULED_TASK_NOT_PRESENT $TaskName"
    }
  } catch {
    Write-Host "SCHEDULED_TASK_REMOVE_SKIPPED reason=$($_.Exception.Message)"
  }
}

function Show-Status {
  Write-Host "SERA_AUTO_WATCHER_STATUS"
  Write-Host "TaskName=$TaskName"
  Write-Host "RepoRoot=$RepoRoot"
  Write-Host "AutoOpsRoot=$AutoOpsRoot"
  Write-Host "CommandInbox=$Inbox"
  Write-Host "Runner=$Runner"
  Write-Host "StartupFolder=$StartupFolder"
  Write-Host "StartupFallback=$StartupCmd"
  Write-Host "StartupFallbackExists=$((Test-Path $StartupCmd))"

  try {
    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($Task) {
      Write-Host "ScheduledTaskExists=True"
      Write-Host "ScheduledTaskState=$($Task.State)"
      try {
        $Info = Get-ScheduledTaskInfo -TaskName $TaskName
        Write-Host "LastRunTime=$($Info.LastRunTime)"
        Write-Host "NextRunTime=$($Info.NextRunTime)"
        Write-Host "LastTaskResult=$($Info.LastTaskResult)"
      } catch {
        Write-Host "ScheduledTaskInfoUnavailable=$($_.Exception.Message)"
      }
    } else {
      Write-Host "ScheduledTaskExists=False"
    }
  } catch {
    Write-Host "ScheduledTaskStatusUnavailable=$($_.Exception.Message)"
  }

  $Running = Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*SERA_AUTO_WATCHER_RUNNER.ps1*" -or $_.CommandLine -like "*SERA_WATCH_COMMAND_INBOX.ps1*" }

  Write-Host "WatcherProcessCount=$(@($Running).Count)"

  foreach ($Proc in @($Running)) {
    Write-Host "WatcherProcess PID=$($Proc.ProcessId)"
  }
}

function Start-Now {
  Assert-Runner

  $Args = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $Runner,
    "-RepoRoot", $RepoRoot,
    "-AutoOpsRoot", $AutoOpsRoot
  )

  if ($LaunchBrowserIfNeeded) {
    $Args += "-LaunchBrowserIfNeeded"
  }

  Start-Process -FilePath "powershell.exe" -ArgumentList $Args -WindowStyle Minimized
  Write-Host "AUTO_WATCHER_START_NOW_LAUNCHED"
}

if ($Mode -eq "Enable") {
  Assert-Runner

  try {
    Try-RegisterTask
    if (Test-Path $StartupCmd) {
      Remove-StartupFallback
    }
    Write-Host "AUTO_WATCHER_ENABLE_MODE=ScheduledTask"
  } catch {
    Write-Host "SCHEDULED_TASK_ENABLE_FAILED_USING_STARTUP_FALLBACK reason=$($_.Exception.Message)"
    Write-StartupFallback
    Write-Host "AUTO_WATCHER_ENABLE_MODE=StartupFallback"
  }

  Show-Status
  exit 0
}

if ($Mode -eq "Disable") {
  Try-UnregisterTask
  Remove-StartupFallback
  Show-Status
  exit 0
}

if ($Mode -eq "StartNow") {
  try {
    $Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($Task) {
      Start-ScheduledTask -TaskName $TaskName
      Write-Host "SCHEDULED_TASK_START_NOW_LAUNCHED"
    } else {
      Start-Now
    }
  } catch {
    Write-Host "SCHEDULED_TASK_START_FAILED_USING_DIRECT_START reason=$($_.Exception.Message)"
    Start-Now
  }

  Show-Status
  exit 0
}

Show-Status
exit 0
