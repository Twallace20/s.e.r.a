param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseSlug = "phase192_autopilot_reliability_regression_hardening_v1",
  [string]$ExpectedZipFilename = "s.e.r.a_phase192_autopilot_reliability_regression_hardening_v1_overlay.zip",
  [string]$PreviousZipHash = "",
  [string]$CurrentZipHash = "",
  [switch]$AssertOnly
)

$ErrorActionPreference = "Stop"

# PHASE192_AUTOPILOT_RELIABILITY_REGRESSION_HARDENING
# PHASE192_DIRTY_WORKTREE_PREFLIGHT
# PHASE192_SCRIPT_PARSE_PRECHECK
# PHASE192_CHECKSUM_PATH_NORMALIZATION
# PHASE192_ZIP_HASH_CHANGE_ASSERTION
# PHASE192_DUPLICATE_COMMAND_AFTER_SUCCESS_GUARD
# PHASE192_FRESH_HANDOFF_GATES
# PHASE192_PASTEBACK_BEFORE_MERGE_GUARD
# PHASE192_WATCHER_RETURN_PROOF

$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$StateDir = Join-Path $AutoOpsRoot "00_control_center\state"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$CommandInbox = Join-Path $AutoOpsRoot "00_control_center\command_inbox"

function Write-Phase192Marker {
  param([string]$Message)
  Write-Host "PHASE192_RELIABILITY $Message"
}

function Assert-FileExists {
  param([string]$Path, [string]$Label)
  if (!(Test-Path $Path)) {
    throw ("Missing required {0}: {1}" -f $Label, $Path)
  }
}

function Assert-Contains {
  param([string]$Path, [string]$Pattern, [string]$Label)
  Assert-FileExists -Path $Path -Label $Label
  $Text = Get-Content -LiteralPath $Path -Raw
  if ($Text -notlike "*$Pattern*") {
    throw ("Missing required marker '{0}' in {1}: {2}" -f $Pattern, $Label, $Path)
  }
}

function Assert-WorktreeClean {
  Set-Location $RepoRoot
  $Status = (& git status --porcelain)
  if ($Status) {
    throw ("PHASE192_DIRTY_WORKTREE_PREFLIGHT failed. Worktree is dirty:`n{0}" -f ($Status -join "`n"))
  }
  Write-Phase192Marker "PHASE192_DIRTY_WORKTREE_PREFLIGHT clean"
}

function Assert-PowerShellParses {
  param([string[]]$Paths)
  foreach ($Path in $Paths) {
    Assert-FileExists -Path $Path -Label "PowerShell script"
    $Tokens = $null
    $Errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$Tokens, [ref]$Errors) | Out-Null
    if ($Errors -and $Errors.Count -gt 0) {
      throw ("PHASE192_SCRIPT_PARSE_PRECHECK failed for {0}: {1}" -f $Path, $Errors[0].Message)
    }
    Write-Phase192Marker ("PHASE192_SCRIPT_PARSE_PRECHECK parsed {0}" -f $Path)
  }
}

function Assert-ChecksumPathsNormalized {
  $Manifest = Join-Path $RepoRoot ".overlay\CHECKSUMS.sha256"
  Assert-FileExists -Path $Manifest -Label "overlay checksum manifest"
  $Text = Get-Content -LiteralPath $Manifest -Raw
  if ($Text -match "\\") {
    throw "PHASE192_CHECKSUM_PATH_NORMALIZATION failed. CHECKSUMS.sha256 must use forward-slash paths."
  }
  Write-Phase192Marker "PHASE192_CHECKSUM_PATH_NORMALIZATION forward_slashes_ok"
}

function Assert-ZipHashChangeIfRequested {
  if ([string]::IsNullOrWhiteSpace($PreviousZipHash) -or [string]::IsNullOrWhiteSpace($CurrentZipHash)) {
    Write-Phase192Marker "PHASE192_ZIP_HASH_CHANGE_ASSERTION not_requested"
    return
  }

  if ($PreviousZipHash.ToLowerInvariant() -eq $CurrentZipHash.ToLowerInvariant()) {
    throw "PHASE192_ZIP_HASH_CHANGE_ASSERTION failed. ZIP hash did not change after repair."
  }

  Write-Phase192Marker "PHASE192_ZIP_HASH_CHANGE_ASSERTION changed"
}

function Assert-CoreAutopilotMarkers {
  $DirectCloseout = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
  $Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"

  Assert-Contains -Path $DirectCloseout -Pattern "FINAL_HANDOFF_IDENTITY_VALIDATED_BEFORE_MERGE" -Label "direct closeout final handoff identity hard gate"
  Assert-Contains -Path $DirectCloseout -Pattern "PASTEBACK_POSTED_TEXT_MATCH_REQUIRED_BEFORE_MERGE" -Label "direct closeout pasteback-before-merge hard gate"
  Assert-Contains -Path $DirectCloseout -Pattern "Fresh current-phase VERIFY_PASS" -Label "direct closeout fresh verifier handoff gate"
  Assert-Contains -Path $DirectCloseout -Pattern "Fresh current-phase PASS_GUARANTEED" -Label "direct closeout fresh QA handoff gate"
  Assert-Contains -Path $DirectCloseout -Pattern "CLOSED_CLEANLY_HANDOFF_SYNTHESIZED" -Label "direct closeout synthesized closeout marker"

  Assert-Contains -Path $Watcher -Pattern "AUTOPILOT_QUEUE_PAUSED_SKIPPING_DOWNSTREAM" -Label "watcher blocked queue downstream guard"
  Assert-Contains -Path $Watcher -Pattern "WATCHER_RETURN_TO_WATCH_AFTER_RUN" -Label "watcher return proof marker"
  Assert-Contains -Path $Watcher -Pattern "EXACT_ZIP_ALREADY_PRESENT_SKIP_BROWSER_BRIDGE" -Label "watcher exact ZIP bridge bypass marker"
  Assert-Contains -Path $Watcher -Pattern "FINAL_HANDOFF_IDENTITY_VALIDATED" -Label "watcher final handoff identity marker"

  Write-Phase192Marker "PHASE192_FRESH_HANDOFF_GATES present"
  Write-Phase192Marker "PHASE192_PASTEBACK_BEFORE_MERGE_GUARD present"
  Write-Phase192Marker "PHASE192_WATCHER_RETURN_PROOF present"
}

function Assert-NoDuplicatePhaseCommandAftershock {
  $QueueState = Join-Path $StateDir "autopilot-sequential-phase-queue-v1.json"
  $PauseState = Join-Path $StateDir "autopilot-sequence-paused-after-block-v1.json"

  foreach ($StatePath in @($QueueState, $PauseState)) {
    if (!(Test-Path $StatePath)) {
      continue
    }

    $Raw = Get-Content -LiteralPath $StatePath -Raw
    if ($Raw -like "*`"status`":*`"BLOCKED`"*" -and $Raw -like "*phase191_full_autopilot_from_beginning_proof_v1*") {
      throw ("PHASE192_DUPLICATE_COMMAND_AFTER_SUCCESS_GUARD failed. Stale Phase191 blocked state remains: {0}" -f $StatePath)
    }
  }

  Write-Phase192Marker "PHASE192_DUPLICATE_COMMAND_AFTER_SUCCESS_GUARD no_stale_phase191_block"
}

function Invoke-Phase192ReliabilityRegression {
  $Verifier = Join-Path $RepoRoot "scripts\verify-phase192-autopilot-reliability-regression-hardening-v1.ps1"
  $Qa = Join-Path $RepoRoot "scripts\phase192-autopilot-reliability-regression-hardening-v1.ps1"
  $ThisScript = Join-Path $RepoRoot "scripts\sera-autopilot-reliability-regression-hardening-v1.ps1"
  $DirectCloseout = Join-Path $RepoRoot "scripts\sera-direct-zip-to-closed-cleanly-v1.ps1"
  $Watcher = Join-Path $RepoRoot "SERA_WATCH_COMMAND_INBOX.ps1"

  Assert-WorktreeClean
  Assert-PowerShellParses -Paths @($ThisScript, $Verifier, $Qa, $DirectCloseout, $Watcher)
  Assert-ChecksumPathsNormalized
  Assert-ZipHashChangeIfRequested
  Assert-CoreAutopilotMarkers
  Assert-NoDuplicatePhaseCommandAftershock

  Write-Phase192Marker "PHASE192_AUTOPILOT_RELIABILITY_REGRESSION_HARDENING PASS"
}

Invoke-Phase192ReliabilityRegression
exit 0
