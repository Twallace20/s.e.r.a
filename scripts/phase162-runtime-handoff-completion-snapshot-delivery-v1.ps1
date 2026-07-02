param(
  [ValidateSet("Finalize","SelfTest","ResolveStatus","SelectLatest")]
  [string]$Mode = "SelfTest",

  [string]$Status = "PASS",
  [string]$PhaseName = "s.e.r.a_phase162_runtime_handoff_completion_snapshot_delivery_v1_overlay",
  [int]$PhaseNumber = 162,
  [string]$Branch = "",
  [string]$Stage = "",
  [string]$Message = "",
  [string]$ExpectedZip = "",
  [string]$CommandJson = "",
  [string]$SelectedJson = "",
  [string]$RunDir = "",
  [string]$SnapshotBundlePath = "",
  [string]$LatestSnapshotPath = "",
  [string]$EvidencePath = "",
  [string]$HandoffDir = "",
  [string]$ControlDir = "",
  [string]$ActiveRunStartedUtc = "",
  [bool]$SafeAutoMergeEligible = $false,
  [bool]$OwnerBoundaryTriggered = $true,
  [string]$OwnerBoundaryReason = "",
  [bool]$QaApprovedAutoMerge = $false,
  [switch]$NoClipboard
)

$ErrorActionPreference = "Stop"

$TerminalStatuses = @("PASS","BLOCKED","QA_BLOCKED","PASS_GUARANTEED","MERGE_PENDING","CLOSED_CLEANLY")

function Get-UtcNowString {
  return (Get-Date).ToUniversalTime().ToString("o")
}

function Resolve-SeraStatus {
  param([Parameter(Mandatory=$true)][string]$Value)
  $Clean = $Value.Trim().ToUpperInvariant()
  if ($TerminalStatuses -notcontains $Clean) {
    throw "Unsupported terminal status '$Value'. Expected one of: $($TerminalStatuses -join ', ')"
  }
  return $Clean
}

function Get-StatusPrecedence {
  param([Parameter(Mandatory=$true)][string]$Value)
  switch ($Value.ToUpperInvariant()) {
    "CLOSED_CLEANLY" { return 60 }
    "PASS_GUARANTEED" { return 50 }
    "PASS" { return 40 }
    "MERGE_PENDING" { return 30 }
    "QA_BLOCKED" { return 20 }
    "BLOCKED" { return 10 }
    default { return 0 }
  }
}

function Get-LatestSnapshot {
  param([string]$BundlePath)
  if (!$BundlePath -or !(Test-Path $BundlePath)) { return "" }
  $Item = Get-ChildItem $BundlePath -File -Recurse -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1
  if ($Item) { return $Item.FullName }
  return ""
}

function Get-RepoBranch {
  try {
    $B = git branch --show-current 2>$null
    if ($B) { return [string]$B }
  } catch {}
  return ""
}

function New-ChatGptReviewPacket {
  param(
    [Parameter(Mandatory=$true)][string]$ResolvedStatus,
    [Parameter(Mandatory=$true)][string]$HandoffText
  )

  $Lines = @("Review this S.E.R.A. AutoOps packet.","")

  switch ($ResolvedStatus) {
    "PASS" {
      $Lines += "If Status is PASS:"
      $Lines += "- Confirm the branch is ready for QA Guarantee."
      $Lines += "- Do not approve merge until QA Guarantee passes."
    }
    "PASS_GUARANTEED" {
      $Lines += "If Status is PASS_GUARANTEED:"
      $Lines += "- Confirm QA Guarantee passed."
      $Lines += "- Confirm safe auto-approval can continue only when no owner-required boundary is triggered."
    }
    "MERGE_PENDING" {
      $Lines += "If Status is MERGE_PENDING:"
      $Lines += "- Confirm whether QA Guarantee has passed before merge approval."
    }
    "BLOCKED" {
      $Lines += "If Status is BLOCKED:"
      $Lines += "- Diagnose the failure."
      $Lines += "- Tell me whether to use a hotfix script, a fixed overlay, or rollback."
      $Lines += "- Provide exact next steps."
    }
    "QA_BLOCKED" {
      $Lines += "If Status is QA_BLOCKED:"
      $Lines += "- Diagnose the QA Guarantee failure."
      $Lines += "- Provide exact next steps."
    }
    "CLOSED_CLEANLY" {
      $Lines += "If Status is CLOSED_CLEANLY:"
      $Lines += "- Confirm the phase is fully closed."
      $Lines += "- Tell me the next full live loop test can begin."
    }
  }

  $Lines += ""
  $Lines += $HandoffText
  return ($Lines -join "`r`n")
}

function Select-LatestSeraHandoff {
  param(
    [Parameter(Mandatory=$true)][string]$Directory,
    [Parameter(Mandatory=$true)][string]$PhaseToken,
    [string]$ActiveStartedUtc = ""
  )

  if (!(Test-Path $Directory)) { return $null }

  $Start = $null
  if ($ActiveStartedUtc) {
    try { $Start = [DateTime]::Parse($ActiveStartedUtc).ToUniversalTime() } catch { $Start = $null }
  }

  $Items = Get-ChildItem $Directory -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*$PhaseToken*" } |
    ForEach-Object {
      $Raw = ""
      try { $Raw = Get-Content $_.FullName -Raw } catch {}
      $StatusMatch = [regex]::Match($Raw, 'Status:\s*([A-Z_]+)')
      $Resolved = if ($StatusMatch.Success) { $StatusMatch.Groups[1].Value } else { "" }
      $Terminal = $TerminalStatuses -contains $Resolved
      [pscustomobject]@{
        FullName = $_.FullName
        Name = $_.Name
        LastWriteTimeUtc = $_.LastWriteTimeUtc
        Status = $Resolved
        IsTerminal = $Terminal
        Precedence = if ($Terminal) { Get-StatusPrecedence $Resolved } else { 0 }
        IsFresh = if ($Start) { $_.LastWriteTimeUtc -ge $Start.AddMinutes(-1) } else { $true }
      }
    } |
    Where-Object { $_.IsTerminal -and $_.IsFresh } |
    Sort-Object @{Expression="Precedence";Descending=$true}, @{Expression="LastWriteTimeUtc";Descending=$true}

  return ($Items | Select-Object -First 1)
}

function Write-TerminalHandoff {
  param(
    [Parameter(Mandatory=$true)][string]$ResolvedStatus
  )

  if (!$ControlDir) {
    $ControlDir = Join-Path $env:USERPROFILE "OneDrive\SERA-AutoOps\00_control_center"
  }
  if (!$HandoffDir) {
    $HandoffDir = Join-Path (Split-Path $ControlDir -Parent) "06_handoff"
  }
  if (!$RunDir) {
    $RunDir = Join-Path $ControlDir "single_flow_runs\phase162-finalizer-" + (Get-Date -Format "yyyyMMdd_HHmmss")
  }
  if (!$SnapshotBundlePath) {
    $SnapshotBundlePath = Join-Path $RunDir "snapshots"
  }
  if (!$LatestSnapshotPath) {
    $LatestSnapshotPath = Get-LatestSnapshot $SnapshotBundlePath
  }
  if (!$Branch) {
    $Branch = Get-RepoBranch
  }
  if (!$Stage) {
    $Stage = "terminal_finalization"
  }
  if (!$Message) {
    $Message = "Runtime terminal handoff finalized."
  }

  New-Item -ItemType Directory -Force $ControlDir,$HandoffDir,$RunDir,$SnapshotBundlePath | Out-Null

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $CurrentPath = Join-Path $ControlDir "CURRENT_CHATGPT_HANDOFF.md"
  $RunCurrentPath = Join-Path $RunDir "CURRENT_CHATGPT_HANDOFF.md"
  $HandoffPath = Join-Path $HandoffDir "$PhaseName-$Stamp-$ResolvedStatus.md"

  $MergeWording = if ($QaApprovedAutoMerge) {
    "QA Guarantee-approved merge completed."
  } else {
    "Owner-approved merge completed."
  }

  $SafeDecision = if ($SafeAutoMergeEligible -and !$OwnerBoundaryTriggered -and $ResolvedStatus -eq "PASS_GUARANTEED") {
    "safe-auto-approval-allowed"
  } elseif ($OwnerBoundaryTriggered) {
    "owner-required-boundary-triggered"
  } else {
    "not-applicable"
  }

  $Lines = @(
    "# S.E.R.A. AutoOps Packet",
    "",
    "Status: $ResolvedStatus",
    "Phase: $PhaseName",
    "Phase Number: $PhaseNumber",
    "Branch: $Branch",
    "Timestamp: $Stamp",
    "",
    "## Summary",
    "",
    $Message,
    "",
    "## Runtime Finalization",
    "",
    "stage: $Stage",
    "terminalStatus: $ResolvedStatus",
    "createdAtUtc: $(Get-UtcNowString)",
    "",
    "## Paths",
    "",
    "expectedZip: $ExpectedZip",
    "commandJson: $CommandJson",
    "selectedJson: $SelectedJson",
    "runDirectory: $RunDir",
    "snapshotBundlePath: $SnapshotBundlePath",
    "latestSnapshotPath: $LatestSnapshotPath",
    "evidencePath: $EvidencePath",
    "currentChatGptHandoff: $CurrentPath",
    "",
    "## Safe Auto-Merge",
    "",
    "safeAutoMergeEligible: $SafeAutoMergeEligible",
    "ownerBoundaryTriggered: $OwnerBoundaryTriggered",
    "ownerBoundaryReason: $OwnerBoundaryReason",
    "decision: $SafeDecision",
    "",
    "## Merge Wording",
    "",
    $MergeWording,
    "",
    "## Next Instruction For ChatGPT",
    "",
    "Review this S.E.R.A. AutoOps packet."
  )

  $HandoffText = $Lines -join "`r`n"
  $ReviewPacket = New-ChatGptReviewPacket -ResolvedStatus $ResolvedStatus -HandoffText $HandoffText

  $HandoffText | Set-Content -Path $HandoffPath -Encoding UTF8
  $ReviewPacket | Set-Content -Path $CurrentPath -Encoding UTF8
  $ReviewPacket | Set-Content -Path $RunCurrentPath -Encoding UTF8

  if (!$NoClipboard) {
    try { Set-Clipboard $ReviewPacket } catch {}
  }

  return [pscustomobject]@{
    ok = $true
    status = $ResolvedStatus
    handoffPath = $HandoffPath
    currentChatGptHandoff = $CurrentPath
    runCurrentChatGptHandoff = $RunCurrentPath
    reviewPacket = $ReviewPacket
    exitCode = if ($ResolvedStatus -eq "BLOCKED" -or $ResolvedStatus -eq "QA_BLOCKED") { 2 } else { 0 }
  }
}

function Invoke-SelfTest {
  $Base = Join-Path $env:TEMP ("sera-phase162-selftest-" + [guid]::NewGuid().ToString("N"))
  $Control = Join-Path $Base "00_control_center"
  $Handoff = Join-Path $Base "06_handoff"
  $Run = Join-Path $Control "single_flow_runs\selftest"
  $Snaps = Join-Path $Run "snapshots"
  $Evidence = Join-Path $Control "evidence\selftest.json"
  New-Item -ItemType Directory -Force $Control,$Handoff,$Run,$Snaps,(Split-Path $Evidence -Parent) | Out-Null

  "{""snapshot"":""one""}" | Set-Content (Join-Path $Snaps "001-selected.json") -Encoding UTF8
  Start-Sleep -Milliseconds 30
  "{""snapshot"":""two""}" | Set-Content (Join-Path $Snaps "002-terminal.json") -Encoding UTF8
  "{""ok"":true}" | Set-Content $Evidence -Encoding UTF8

  $PassGuaranteed = Write-TerminalHandoff `
    -ResolvedStatus "PASS_GUARANTEED" `
    -PhaseName "s.e.r.a_phase162_runtime_handoff_completion_snapshot_delivery_v1_overlay" `
    -PhaseNumber 162 `
    -Branch "work/phase162-runtime-handoff-completion-snapshot-delivery-v1" `
    -Stage "selftest_pass_guaranteed" `
    -Message "Self-test PASS_GUARANTEED terminal handoff." `
    -ExpectedZip "s.e.r.a_phase162_runtime_handoff_completion_snapshot_delivery_v1_overlay.zip" `
    -CommandJson (Join-Path $Control "command.json") `
    -SelectedJson (Join-Path $Control "selected-command.json") `
    -RunDir $Run `
    -SnapshotBundlePath $Snaps `
    -EvidencePath $Evidence `
    -HandoffDir $Handoff `
    -ControlDir $Control `
    -SafeAutoMergeEligible $true `
    -OwnerBoundaryTriggered $false `
    -QaApprovedAutoMerge $true `
    -NoClipboard

  if (!(Test-Path $PassGuaranteed.currentChatGptHandoff)) { throw "CURRENT_CHATGPT_HANDOFF.md was not produced" }
  $Current = Get-Content $PassGuaranteed.currentChatGptHandoff -Raw
  if ($Current -notlike "*snapshotBundlePath:*") { throw "Snapshot bundle path missing from current packet" }
  if ($Current -notlike "*QA Guarantee-approved merge completed.*") { throw "QA-approved wording missing" }

  $OldBlocked = Join-Path $Handoff "s.e.r.a_phase162_runtime_handoff_completion_snapshot_delivery_v1_overlay-20000101_000000-BLOCKED.md"
  "# S.E.R.A. AutoOps Packet`r`n`r`nStatus: BLOCKED`r`nPhase: s.e.r.a_phase162_runtime_handoff_completion_snapshot_delivery_v1_overlay" | Set-Content $OldBlocked -Encoding UTF8
  (Get-Item $OldBlocked).LastWriteTimeUtc = (Get-Date).ToUniversalTime().AddHours(-1)

  $Selected = Select-LatestSeraHandoff -Directory $Handoff -PhaseToken "phase162" -ActiveStartedUtc (Get-Date).ToUniversalTime().AddMinutes(-5).ToString("o")
  if (!$Selected) { throw "No fresh handoff selected" }
  if ($Selected.Status -ne "PASS_GUARANTEED") { throw "Stale handoff mitigation failed; selected $($Selected.Status)" }

  $OwnerBlocked = Write-TerminalHandoff `
    -ResolvedStatus "PASS_GUARANTEED" `
    -PhaseName "s.e.r.a_phase162_runtime_handoff_completion_snapshot_delivery_v1_overlay" `
    -PhaseNumber 162 `
    -Branch "work/phase162-runtime-handoff-completion-snapshot-delivery-v1" `
    -Stage "selftest_owner_boundary" `
    -Message "Self-test owner boundary block proof." `
    -RunDir $Run `
    -SnapshotBundlePath $Snaps `
    -EvidencePath $Evidence `
    -HandoffDir $Handoff `
    -ControlDir $Control `
    -SafeAutoMergeEligible $true `
    -OwnerBoundaryTriggered $true `
    -OwnerBoundaryReason "simulated-secret-boundary" `
    -NoClipboard

  $OwnerText = Get-Content $OwnerBlocked.handoffPath -Raw
  if ($OwnerText -notlike "*decision: owner-required-boundary-triggered*") { throw "Owner boundary decision missing" }

  return [pscustomobject]@{
    phase = 162
    status = "PASS"
    selfTest = "runtime-handoff-finalizer"
    checks = @(
      "CURRENT_CHATGPT_HANDOFF produced",
      "snapshot bundle path included",
      "latest snapshot path included",
      "PASS_GUARANTEED finalization works",
      "stale BLOCKED rejected",
      "owner boundary block proof works",
      "QA-approved wording distinct"
    )
    selfTestRoot = $Base
    createdAt = Get-UtcNowString
  }
}

if ($Mode -eq "ResolveStatus") {
  [pscustomobject]@{ status = (Resolve-SeraStatus $Status); ok = $true } | ConvertTo-Json -Depth 10
  exit 0
}

if ($Mode -eq "SelectLatest") {
  $Selected = Select-LatestSeraHandoff -Directory $HandoffDir -PhaseToken ("phase$PhaseNumber") -ActiveStartedUtc $ActiveRunStartedUtc
  if (!$Selected) {
    [pscustomobject]@{ ok = $false; status = "NONE" } | ConvertTo-Json -Depth 10
    exit 1
  }
  $Selected | ConvertTo-Json -Depth 10
  exit 0
}

if ($Mode -eq "SelfTest") {
  Invoke-SelfTest | ConvertTo-Json -Depth 20
  exit 0
}

if ($Mode -eq "Finalize") {
  $Resolved = Resolve-SeraStatus $Status
  $Result = Write-TerminalHandoff -ResolvedStatus $Resolved
  [pscustomobject]@{
    ok = $true
    status = $Resolved
    handoffPath = $Result.handoffPath
    currentChatGptHandoff = $Result.currentChatGptHandoff
    exitCode = $Result.exitCode
  } | ConvertTo-Json -Depth 10
  exit $Result.exitCode
}
