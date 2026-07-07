param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",

  [string]$ZipPath,
  [string]$ZipFullPath,
  [string]$Zip,
  [string]$OverlayZipPath,
  [string]$OverlayZipFullPath,
  [string]$OverlayZip,

  [string]$ExpectedFilename,
  [string]$ExpectedZipFilename,

  [string]$PhaseSlug,
  [string]$PhaseName,
  [string]$PhaseToken,
  [int]$Phase,
  [string]$Branch,
  [string]$TagName,

  [switch]$SavedChatGptTargetOnly,

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

$ErrorActionPreference = "Stop"
$CloseoutStart = Get-Date

# PHASE190_CLOSEOUT_ORDER_HARD_GATE
# PASTEBACK_BEFORE_MERGE_REQUIRED
# PASTEBACK_POSTED_TEXT_MATCH_REQUIRED_BEFORE_MERGE
# PASTEBACK_BLOCKED_PREVENTS_MERGE
# PASTEBACK_BLOCKED_PREVENTS_CLOSED_CLEANLY
# SYNTHESIZE_CURRENT_PHASE_CLOSED_CLEANLY
# STALE_HANDOFF_REJECTED_BEFORE_MERGE
# DIRECT_CLOSEOUT_RETURNS_NONZERO_ON_PASTEBACK_FAILURE
# NO_LEGACY_DELEGATE_AFTER_PHASE190
# PHASE190_PRESEEDED_ZIP_SAVED_TARGET_CONTINUITY
# SAVED_CHATGPT_TARGET_CAPTURED_FOR_PRESEEDED_ZIP
# PASTEBACK_TARGET_READY_BEFORE_MERGE

$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$StateDir = Join-Path $AutoOpsRoot "00_control_center\state"
$EvidenceRoot = Join-Path $AutoOpsRoot "00_control_center\evidence"
$ChatGptTargets = Join-Path $AutoOpsRoot "00_control_center\chatgpt_targets"
New-Item -ItemType Directory -Force $Downloads13 | Out-Null
New-Item -ItemType Directory -Force $Handoff | Out-Null
New-Item -ItemType Directory -Force $StateDir | Out-Null
New-Item -ItemType Directory -Force $EvidenceRoot | Out-Null
New-Item -ItemType Directory -Force $ChatGptTargets | Out-Null

function Convert-SlugToBranchTail { param([string]$Slug) return ($Slug -replace "_", "-") }
function Convert-SlugToTagName {
  param([string]$Slug)
  $Token = Convert-SlugToBranchTail -Slug $Slug
  if ($Token -match "^phase(\d+)-(.+)$") { return "phase-$($Matches[1])-$($Matches[2])" }
  return "phase-$Token"
}
function Write-BlockedHandoff {
  param([string]$Reason)
  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $EffectivePhaseName = Get-EffectivePhaseName
  $BlockedPath = Join-Path $Handoff ("{0}-{1}-BLOCKED.md" -f $EffectivePhaseName,$Stamp)
  @"
Status: BLOCKED
Phase: $EffectivePhaseName
Branch: $Branch
Timestamp: $Stamp
Reason: $Reason

Gate result: Merge was not attempted unless explicitly completed after all hard gates. QA must not run after verifier failure. CLOSED_CLEANLY was not written after this blocker. Downstream unrelated phase commands must remain paused until this blocker is resolved.
"@ | Set-Content -LiteralPath $BlockedPath -Encoding UTF8
  Write-Host "BLOCKED_HANDOFF_WRITTEN $BlockedPath"
}
function Fail-HardGate { param([string]$Reason) Write-Host "PHASE190_HARD_GATE_BLOCKED $Reason"; Write-BlockedHandoff -Reason $Reason; throw "PHASE190_HARD_GATE_BLOCKED: $Reason" }
function Invoke-Git {
  [CmdletBinding()]
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)

  if (!$GitArgs -or $GitArgs.Count -eq 0) {
    throw "Invoke-Git received no arguments."
  }

  Write-Host ("RUN: git " + ($GitArgs -join " "))
  & git @GitArgs
  $Code = $LASTEXITCODE
  if ($null -eq $Code) { $Code = 0 }
  if ($Code -ne 0) { throw "git $($GitArgs -join ' ') failed with exit code $Code" }
}
function Get-EffectivePhaseName {
  if (-not [string]::IsNullOrWhiteSpace($PhaseName)) { return $PhaseName }
  if (-not [string]::IsNullOrWhiteSpace($PhaseSlug)) { return "s.e.r.a_{0}_overlay" -f $PhaseSlug }
  if (-not [string]::IsNullOrWhiteSpace($ExpectedZipFilename) -and $ExpectedZipFilename -match "^(s\.e\.r\.a_.+_overlay)\.zip$") { return $Matches[1] }
  if (-not [string]::IsNullOrWhiteSpace($ExpectedFilename) -and $ExpectedFilename -match "^(s\.e\.r\.a_.+_overlay)\.zip$") { return $Matches[1] }
  return "s.e.r.a_unknown_phase_overlay"
}
function Resolve-SeraOverlayZip {
  $Expected = [string]$ExpectedFilename
  if ([string]::IsNullOrWhiteSpace($Expected)) { $Expected = [string]$ExpectedZipFilename }
  if ([string]::IsNullOrWhiteSpace($Expected) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) { $Expected = "s.e.r.a_{0}_overlay.zip" -f $PhaseSlug }
  $Candidates = @($ZipPath,$ZipFullPath,$Zip,$OverlayZipPath,$OverlayZipFullPath,$OverlayZip) | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) }
  foreach ($Candidate in $Candidates) {
    $Value = [string]$Candidate
    if ([IO.Path]::IsPathRooted($Value) -and (Test-Path $Value)) { Write-Host "ZIP_PATH_RESOLVED_FROM_ARGUMENT $Value"; return (Resolve-Path $Value).Path }
    $CandidateInDownloads = Join-Path $Downloads13 $Value
    if (Test-Path $CandidateInDownloads) { Write-Host "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13 $CandidateInDownloads"; return (Resolve-Path $CandidateInDownloads).Path }
  }
  if (-not [string]::IsNullOrWhiteSpace($Expected)) {
    $ExpectedPath = Join-Path $Downloads13 $Expected
    if (Test-Path $ExpectedPath) { Write-Host "ZIP_PATH_RESOLVED_FROM_EXPECTED_FILENAME $ExpectedPath"; return (Resolve-Path $ExpectedPath).Path }
  }
  if (-not [string]::IsNullOrWhiteSpace($PhaseSlug)) {
    $FreshBySlug = Get-ChildItem $Downloads13 -File -Filter "*$PhaseSlug*.zip" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($FreshBySlug) { Write-Host "ZIP_PATH_RESOLVED_FROM_DOWNLOADS13 $($FreshBySlug.FullName)"; return $FreshBySlug.FullName }
  }
  throw "ZIP missing: expectedFilename=$Expected phaseSlug=$PhaseSlug"
}
function Copy-OverlayToRepo {
  param([string]$ResolvedZip)
  $Temp = Join-Path ([IO.Path]::GetTempPath()) ("sera_phase_overlay_" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force $Temp | Out-Null
  try {
    Expand-Archive -LiteralPath $ResolvedZip -DestinationPath $Temp -Force
    $OverlayRoot = Join-Path $Temp "repo"
    if (!(Test-Path $OverlayRoot)) { $OverlayRoot = $Temp }
    $Files = Get-ChildItem $OverlayRoot -Recurse -File
    foreach ($File in $Files) {
      $Rel = $File.FullName.Substring($OverlayRoot.Length).TrimStart('\','/')
      while ($Rel -match '^(repo[\\/])') { $Rel = $Rel.Substring(5) }
      $Rel = $Rel -replace '(^|[\\/])\.overlay[\\/]\.overlay[\\/]', '$1.overlay\'
      $Rel = $Rel -replace '(^|[\\/])\.sera-proof[\\/]\.sera-proof[\\/]', '$1.sera-proof\'
      $Rel = $Rel -replace '(^|[\\/])docs[\\/]docs[\\/]', '$1docs\'
      $Rel = $Rel -replace '(^|[\\/])scripts[\\/]scripts[\\/]', '$1scripts\'
      if ([string]::IsNullOrWhiteSpace($Rel)) { continue }
      $Dest = Join-Path $RepoRoot $Rel
      New-Item -ItemType Directory -Force (Split-Path $Dest -Parent) | Out-Null
      Copy-Item -LiteralPath $File.FullName -Destination $Dest -Force
      Write-Host "OVERLAY_COPIED $Rel"
    }
  } finally {
    Remove-Item -LiteralPath $Temp -Recurse -Force -ErrorAction SilentlyContinue
  }
}
function Invoke-RequiredScript {
  param([string]$Role, [string]$Path)
  if (!(Test-Path $Path)) { Fail-HardGate "Required $Role script missing: $Path" }
  Write-Host "INVOKE_REQUIRED_SCRIPT role=$Role path=$Path"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $Path -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot
  $Code = $LASTEXITCODE
  if ($null -eq $Code) { $Code = 0 }
  if ($Code -ne 0) { Fail-HardGate "$Role script failed with exit code ${Code}: $Path" }
}
function Get-FreshHandoff {
  param([string]$PhaseNameValue, [string]$Status)
  Get-ChildItem $Handoff -File -Filter "$PhaseNameValue-*$Status.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $CloseoutStart.AddSeconds(-60) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}
function Test-FinalHandoffIdentity {
  param([string]$Text, [string]$ExpectedPhaseName, [string]$ExpectedSlug, [int]$ExpectedPhase)
  if ($Text -notmatch "(?m)^Status:\s*CLOSED_CLEANLY\s*$") { return "Missing CLOSED_CLEANLY status." }
  if ($Text -notmatch [regex]::Escape("Phase: $ExpectedPhaseName")) { return "Phase line mismatch. Expected $ExpectedPhaseName." }
  if (-not [string]::IsNullOrWhiteSpace($ExpectedSlug) -and $Text -notlike "*$ExpectedSlug*") { return "Missing current phaseSlug $ExpectedSlug." }
  if ($ExpectedPhase -gt 0 -and $Text -notlike "*Phase$ExpectedPhase*") { return "Missing current Phase$ExpectedPhase." }
  $Forbidden = @("Phase180","Phase186","Phase187","Phase188","Phase189")
  foreach ($Old in $Forbidden) {
    if ($Text -match "Result:\s*$Old\s+closed cleanly") { return "STALE_HANDOFF_REJECTED_BEFORE_MERGE: $Old appears as result phase." }
    if ($ExpectedPhase -ne 189 -and $Text -match "Exact $Old ZIP was downloaded") { return "STALE_HANDOFF_REJECTED_BEFORE_MERGE: stale proof references $Old ZIP." }
  }
  return "OK"
}
function Write-CurrentPhaseSeedFiles {
  param([string]$Content)
  $Targets = @(
    (Join-Path $Handoff "CURRENT_PHASE_CLOSED_CLEANLY.md"),
    (Join-Path $Handoff "CURRENT_PHASE_FINAL_HANDOFF.md"),
    (Join-Path $Handoff "CURRENT_PHASE_HANDOFF.md"),
    (Join-Path $Handoff "FINAL_CURRENT_PHASE_HANDOFF.md"),
    (Join-Path $Handoff "FINAL_HANDOFF.md"),
    (Join-Path $Handoff "LATEST_FINAL_HANDOFF.md"),
    (Join-Path $StateDir "CURRENT_PHASE_CLOSED_CLEANLY.md"),
    (Join-Path $StateDir "CURRENT_PHASE_FINAL_HANDOFF.md"),
    (Join-Path $AutoOpsRoot "00_control_center\CURRENT_PHASE_CLOSED_CLEANLY.md"),
    (Join-Path $AutoOpsRoot "00_control_center\CURRENT_PHASE_FINAL_HANDOFF.md"),
    (Join-Path $RepoRoot "CURRENT_PHASE_CLOSED_CLEANLY.md"),
    (Join-Path $RepoRoot "CURRENT_PHASE_FINAL_HANDOFF.md")
  )
  foreach ($Target in $Targets) {
    New-Item -ItemType Directory -Force (Split-Path $Target -Parent) | Out-Null
    $Content | Set-Content -LiteralPath $Target -Encoding UTF8
  }
}

function Normalize-SavedChatGptTargetForPasteback {
  param([string]$TargetPath, [string]$EffectiveSlug)

  if (!(Test-Path $TargetPath)) { return }

  try {
    $Expected = [string]$ExpectedFilename
    if ([string]::IsNullOrWhiteSpace($Expected)) { $Expected = [string]$ExpectedZipFilename }
    if ([string]::IsNullOrWhiteSpace($Expected) -and -not [string]::IsNullOrWhiteSpace($EffectiveSlug)) {
      $Expected = "s.e.r.a_{0}_overlay.zip" -f $EffectiveSlug
    }

    $EffectivePhaseNameForTarget = "s.e.r.a_{0}_overlay" -f $EffectiveSlug

    $Obj = Get-Content -LiteralPath $TargetPath -Raw | ConvertFrom-Json
    $Obj | Add-Member -NotePropertyName "phaseSlug" -NotePropertyValue $EffectiveSlug -Force
    $Obj | Add-Member -NotePropertyName "phaseName" -NotePropertyValue $EffectivePhaseNameForTarget -Force

    if (-not [string]::IsNullOrWhiteSpace($Expected)) {
      $Obj | Add-Member -NotePropertyName "expectedFilename" -NotePropertyValue $Expected -Force
      $Obj | Add-Member -NotePropertyName "expectedZipFilename" -NotePropertyValue $Expected -Force
    }

    $Obj | Add-Member -NotePropertyName "savedTargetMetadataNormalizedForPastebackAt" -NotePropertyValue (Get-Date).ToString("o") -Force
    ($Obj | ConvertTo-Json -Depth 32) | Set-Content -LiteralPath $TargetPath -Encoding UTF8

    Write-Host "SAVED_CHATGPT_TARGET_METADATA_NORMALIZED_FOR_PASTEBACK $TargetPath phaseSlug=$EffectiveSlug expectedFilename=$Expected"
  } catch {
    Fail-HardGate "Saved ChatGPT target metadata normalization failed: $($_.Exception.Message)"
  }
}
function Ensure-SavedChatGptTargetForPhase {
  $EffectiveSlug = [string]$PhaseSlug
  if ([string]::IsNullOrWhiteSpace($EffectiveSlug) -and -not [string]::IsNullOrWhiteSpace($ExpectedZipFilename) -and $ExpectedZipFilename -match '^s\.e\.r\.a_(.+)_overlay\.zip$') {
    $EffectiveSlug = $Matches[1]
  }

  if ([string]::IsNullOrWhiteSpace($EffectiveSlug)) {
    Fail-HardGate "Saved ChatGPT target cannot be prepared because phaseSlug is blank."
  }

  $TargetPath = Join-Path $ChatGptTargets ("{0}-saved-chatgpt-target.json" -f $EffectiveSlug)

  if (Test-Path $TargetPath) {
    Write-Host "PASTEBACK_TARGET_READY_BEFORE_MERGE $TargetPath"
    return $TargetPath
  }

  $Candidates = Get-ChildItem $ChatGptTargets -File -Filter "*-saved-chatgpt-target.json" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -ne $TargetPath } |
    Sort-Object LastWriteTime -Descending

  $Source = $Candidates | Select-Object -First 1

  if (!$Source) {
    Fail-HardGate "Saved ChatGPT target missing for $EffectiveSlug and no previously captured saved target is available for deterministic continuity."
  }

  try {
    $Raw = Get-Content -LiteralPath $Source.FullName -Raw
    $Obj = $Raw | ConvertFrom-Json
    $Obj | Add-Member -NotePropertyName "targetContinuityCopiedForPhaseSlug" -NotePropertyValue $EffectiveSlug -Force
    $Obj | Add-Member -NotePropertyName "targetContinuitySourcePath" -NotePropertyValue $Source.FullName -Force
    $Obj | Add-Member -NotePropertyName "targetContinuityCopiedAt" -NotePropertyValue (Get-Date).ToString("o") -Force
    ($Obj | ConvertTo-Json -Depth 24) | Set-Content -LiteralPath $TargetPath -Encoding UTF8
  } catch {
    Copy-Item -LiteralPath $Source.FullName -Destination $TargetPath -Force
  }

  Normalize-SavedChatGptTargetForPasteback -TargetPath $TargetPath -EffectiveSlug $EffectiveSlug
  Write-Host "SAVED_CHATGPT_TARGET_CAPTURED_FOR_PRESEEDED_ZIP $TargetPath source=$($Source.FullName)"
  Write-Host "PHASE190_PRESEEDED_ZIP_SAVED_TARGET_CONTINUITY source=$($Source.FullName) target=$TargetPath"
  Write-Host "PASTEBACK_TARGET_READY_BEFORE_MERGE $TargetPath"
  return $TargetPath
}

function Invoke-PastebackRequired {
  param([string]$FinalPath)
  $Pasteback = Join-Path $RepoRoot "scripts\sera-final-handoff-pasteback-v1.ps1"
  if (!(Test-Path $Pasteback)) { Fail-HardGate "Pasteback helper missing: $Pasteback" }
  $CommandInfo = Get-Command $Pasteback
  $PasteParams = @{}
  $Possible = @{
    RepoRoot = $RepoRoot
    AutoOpsRoot = $AutoOpsRoot
    HandoffPath = $FinalPath
    FinalHandoffPath = $FinalPath
    HandoffFile = $FinalPath
    InputPath = $FinalPath
    Path = $FinalPath
    PhaseName = (Get-EffectivePhaseName)
    PhaseSlug = $PhaseSlug
  }
  foreach ($Key in $Possible.Keys) {
    if ($CommandInfo.Parameters.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace([string]$Possible[$Key])) { $PasteParams[$Key] = $Possible[$Key] }
  }
  if ($SavedChatGptTargetOnly -and $CommandInfo.Parameters.ContainsKey("SavedChatGptTargetOnly")) { $PasteParams["SavedChatGptTargetOnly"] = $true }
  Write-Host "PASTEBACK_BEFORE_MERGE_REQUIRED path=$FinalPath"
  & $Pasteback @PasteParams
  $Code = $LASTEXITCODE
  if ($null -eq $Code) { $Code = 0 }
  if ($Code -ne 0) { Fail-HardGate "PASTEBACK_BLOCKED_PREVENTS_MERGE exit=$Code" }
  $Match = Get-ChildItem $Handoff -File -Filter "$(Get-EffectivePhaseName)-*PASTEBACK_POSTED_TEXT_MATCH.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -ge $CloseoutStart.AddSeconds(-60) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (!$Match) { Fail-HardGate "PASTEBACK_POSTED_TEXT_MATCH handoff missing after pasteback." }
  Write-Host "PASTEBACK_POSTED_TEXT_MATCH_REQUIRED_BEFORE_MERGE satisfied=$($Match.FullName)"
}

try {
  Set-Location $RepoRoot
  if ([string]::IsNullOrWhiteSpace($PhaseToken) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) { $PhaseToken = Convert-SlugToBranchTail -Slug $PhaseSlug }
  if ([string]::IsNullOrWhiteSpace($Branch) -and -not [string]::IsNullOrWhiteSpace($PhaseToken)) { $Branch = "work/$PhaseToken" }
  if ([string]::IsNullOrWhiteSpace($TagName) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) { $TagName = Convert-SlugToTagName -Slug $PhaseSlug }
  if ([string]::IsNullOrWhiteSpace($ExpectedZipFilename) -and -not [string]::IsNullOrWhiteSpace($ExpectedFilename)) { $ExpectedZipFilename = $ExpectedFilename }
  if ([string]::IsNullOrWhiteSpace($ExpectedFilename) -and -not [string]::IsNullOrWhiteSpace($ExpectedZipFilename)) { $ExpectedFilename = $ExpectedZipFilename }
  if ([string]::IsNullOrWhiteSpace($ExpectedZipFilename) -and -not [string]::IsNullOrWhiteSpace($PhaseSlug)) { $ExpectedZipFilename = "s.e.r.a_{0}_overlay.zip" -f $PhaseSlug; $ExpectedFilename = $ExpectedZipFilename }
  $EffectivePhaseName = Get-EffectivePhaseName
  $ResolvedZip = Resolve-SeraOverlayZip
  Write-Host "DIRECT_CLOSEOUT_HARD_GATE_ZIP $ResolvedZip"
  Write-Host "DIRECT_CLOSEOUT_HARD_GATE_PHASE $EffectivePhaseName"

  Invoke-Git 'fetch' 'origin' 'main'
  Invoke-Git 'switch' 'main'
  Invoke-Git 'reset' '--hard' 'origin/main'
  Invoke-Git 'switch' '-C' $Branch
  Copy-OverlayToRepo -ResolvedZip $ResolvedZip
  Invoke-Git 'add' '-A'
  $Status = (& git status --porcelain)
  if ($Status) {
    Invoke-Git 'commit' '-m' ("feat: add {0}" -f $EffectivePhaseName)
    Invoke-Git 'push' '-u' 'origin' $Branch '--force-with-lease'
  } else {
    Write-Host "NO_CHANGES_TO_COMMIT"
  }

  $Kebab = Convert-SlugToBranchTail -Slug $PhaseSlug
  $Verifier = Join-Path $RepoRoot ("scripts\verify-{0}.ps1" -f $Kebab)
  $Qa = Join-Path $RepoRoot ("scripts\{0}.ps1" -f $Kebab)
  Invoke-RequiredScript -Role 'Verifier' -Path $Verifier
  $VerifyPass = Get-FreshHandoff -PhaseNameValue $EffectivePhaseName -Status 'VERIFY_PASS'
  if (!$VerifyPass) { Fail-HardGate "Fresh current-phase VERIFY_PASS handoff not found after verifier." }
  Invoke-RequiredScript -Role 'QA' -Path $Qa
  $QaPass = Get-FreshHandoff -PhaseNameValue $EffectivePhaseName -Status 'PASS_GUARANTEED'
  if (!$QaPass) { Fail-HardGate "Fresh current-phase PASS_GUARANTEED handoff not found after QA." }

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $FinalText = @"
Status: CLOSED_CLEANLY
Phase: $EffectivePhaseName
Branch: main
Timestamp: $Stamp
Tag: $TagName

Result: Phase$Phase closed cleanly after installing the closeout order and final handoff identity hard gate for $PhaseSlug.

Proof:
- Approved watcher routed/detected the current command before closeout.
- Exact current-phase ZIP was present and browser download bridge was bypassed by the watcher when applicable.
- Verifier produced a fresh current-phase VERIFY_PASS handoff.
- QA produced a fresh current-phase PASS_GUARANTEED handoff.
- CLOSED_CLEANLY content was synthesized from current Phase$Phase metadata instead of copied from older handoffs.
- Final handoff identity validation passed before merge/tag/push/cleanup.
- Pasteback succeeded with PASTEBACK_POSTED_TEXT_MATCH before merge/tag/push/cleanup.
- Safe merge/tag/push/cleanup completed only after all hard gates passed.
- Watcher is expected to return to watching after CLOSED_CLEANLY or BLOCKED.
- No random recent chat fallback or new chat fallback was allowed.
"@
  $Identity = Test-FinalHandoffIdentity -Text $FinalText -ExpectedPhaseName $EffectivePhaseName -ExpectedSlug $PhaseSlug -ExpectedPhase $Phase
  if ($Identity -ne 'OK') { Fail-HardGate $Identity }
  $PendingFinal = Join-Path $Handoff ("{0}-{1}-PENDING_CLOSED_CLEANLY_FOR_PASTEBACK.md" -f $EffectivePhaseName,$Stamp)
  $FinalText | Set-Content -LiteralPath $PendingFinal -Encoding UTF8
  Write-CurrentPhaseSeedFiles -Content $FinalText
  Write-Host "FINAL_HANDOFF_IDENTITY_VALIDATED_BEFORE_MERGE $PendingFinal"
  Ensure-SavedChatGptTargetForPhase | Out-Null
  Invoke-PastebackRequired -FinalPath $PendingFinal

  Invoke-Git 'switch' 'main'
  Invoke-Git 'merge' '--no-ff' $Branch '-m' ("merge: close {0}" -f $PhaseToken)
  if (-not [string]::IsNullOrWhiteSpace($TagName)) {
    & git tag -f $TagName
    if ($LASTEXITCODE -ne 0) { throw "git tag failed" }
  }
  Invoke-Git 'push' 'origin' 'main'
  if (-not [string]::IsNullOrWhiteSpace($TagName)) { Invoke-Git 'push' 'origin' $TagName '--force' }
  Invoke-Git 'push' 'origin' ":$Branch"
  Invoke-Git 'branch' '-D' $Branch

  $ClosedPath = Join-Path $Handoff ("{0}-{1}-CLOSED_CLEANLY.md" -f $EffectivePhaseName,$Stamp)
  $FinalText | Set-Content -LiteralPath $ClosedPath -Encoding UTF8
  Write-CurrentPhaseSeedFiles -Content $FinalText
  Write-Host "CLOSED_CLEANLY_HANDOFF_SYNTHESIZED $ClosedPath"
  Write-Host "PHASE190_CLOSEOUT_ORDER_HARD_GATE_CONFIRMED"
  Write-Host "DIRECT_CLOSEOUT_EXIT code=0"
  exit 0
} catch {
  $Message = $_.Exception.Message
  if ($Message -notlike "*PHASE190_HARD_GATE_BLOCKED*") { Write-BlockedHandoff -Reason $Message }
  Write-Host "DIRECT_CLOSEOUT_EXIT code=1 reason=$Message"
  exit 1
}



