param(
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = "s.e.r.a_phase163_qa_guarantee_hard_stop_integrity_hotfix_v1_overlay",
  [string]$Branch = "work/phase163-qa-guarantee-hard-stop-integrity-hotfix-v1",
  [string]$Verifier = "scripts\verify-phase163-qa-guarantee-hard-stop-integrity-hotfix-v1.ps1",
  [string]$PassHandoffPath = "",
  [string]$MergePendingPath = "",
  [switch]$SelfTest
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

function New-SeraDirectory {
  param([Parameter(Mandatory=$true)][string[]]$Path)
  foreach ($P in $Path) {
    if (!(Test-Path -LiteralPath $P)) {
      New-Item -ItemType Directory -Force -Path $P | Out-Null
    }
  }
}

function Write-CurrentHandoff {
  param(
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$Text,
    [Parameter(Mandatory=$true)][string]$Status
  )

  $CurrentDir = Join-Path $AutoOpsRoot "00_control_center\current_handoff"
  New-SeraDirectory @($CurrentDir)

  $HandoffPath = Join-Path $CurrentDir "CURRENT_CHATGPT_HANDOFF.md"
  $PromptPath = Join-Path $CurrentDir "CURRENT_CHATGPT_HANDOFF.prompt.md"

  $Text | Set-Content -Path $HandoffPath -Encoding UTF8

  $Prompt = @(
    "Review this S.E.R.A. AutoOps packet.",
    "",
    "Status: $Status",
    "",
    "If Status is QA_BLOCKED:",
    "- Diagnose the verifier failure.",
    "- Do not approve merge.",
    "- Provide exact next steps.",
    "",
    "If Status is PASS_GUARANTEED:",
    "- Confirm safe auto-approval may proceed.",
    "- Confirm no owner boundary was triggered.",
    "",
    $Text
  ) -join "`r`n"

  $Prompt | Set-Content -Path $PromptPath -Encoding UTF8

  try { Set-Clipboard $Prompt } catch {}

  return [ordered]@{
    handoffPath = $HandoffPath
    promptPath = $PromptPath
  }
}

function Get-VerifierDecision {
  param(
    [Parameter(Mandatory=$true)][string]$OutputText,
    [Parameter(Mandatory=$true)][int]$ExitCode
  )

  $blockedPatterns = @(
    "NativeCommandError",
    "parameter cannot be found",
    "ParameterBindingException",
    "Cannot bind argument",
    "CommandNotFoundException",
    "FullyQualifiedErrorId",
    "Missing an argument",
    "TerminatingError",
    "ParserError",
    "At .*\.ps1:\d+ char:\d+"
  )

  $hasError = $false
  foreach ($Pattern in $blockedPatterns) {
    if ($OutputText -match $Pattern) {
      $hasError = $true
      break
    }
  }

  $hasExplicitPass = $false
  try {
    $Json = $OutputText | ConvertFrom-Json -ErrorAction Stop
    if ([string]$Json.status -eq "PASS") { $hasExplicitPass = $true }
  } catch {
    if ($OutputText -match '"status"\s*:\s*"PASS"') { $hasExplicitPass = $true }
  }

  if ($ExitCode -ne 0) {
    return [ordered]@{
      ok = $false
      status = "QA_BLOCKED"
      reason = "verifier_exit_nonzero"
      exitCode = $ExitCode
      hasExplicitPass = $hasExplicitPass
      hasError = $hasError
    }
  }

  if ($hasError) {
    return [ordered]@{
      ok = $false
      status = "QA_BLOCKED"
      reason = "verifier_error_text_detected"
      exitCode = $ExitCode
      hasExplicitPass = $hasExplicitPass
      hasError = $true
    }
  }

  if (!$hasExplicitPass) {
    return [ordered]@{
      ok = $false
      status = "QA_BLOCKED"
      reason = "missing_explicit_status_PASS"
      exitCode = $ExitCode
      hasExplicitPass = $false
      hasError = $false
    }
  }

  return [ordered]@{
    ok = $true
    status = "PASS_GUARANTEED"
    reason = "explicit_verifier_PASS"
    exitCode = $ExitCode
    hasExplicitPass = $true
    hasError = $false
  }
}

function Write-TerminalHandoff {
  param(
    [Parameter(Mandatory=$true)][string]$Status,
    [Parameter(Mandatory=$true)][string]$PhaseName,
    [Parameter(Mandatory=$true)][string]$Branch,
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$Summary,
    [string]$EvidencePath = "",
    [string]$VerifierLog = "",
    [string]$Reason = "",
    [string]$MergeDecision = ""
  )

  $Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
  $NeedsAttention = Join-Path $AutoOpsRoot "17_needs_attention"
  New-SeraDirectory @($HandoffDir,$NeedsAttention)

  $Path = Join-Path $HandoffDir "$PhaseName-$Stamp-$Status.md"

  $Lines = @(
    "# S.E.R.A. AutoOps Packet",
    "",
    "Status: $Status",
    "Phase: $PhaseName",
    "Branch: $Branch",
    "Timestamp: $Stamp",
    "",
    "## Summary",
    "",
    $Summary,
    "",
    "## Evidence",
    "",
    "Evidence path: $EvidencePath",
    "Verifier log: $VerifierLog",
    "Reason: $Reason",
    "",
    "## Decision",
    "",
    $MergeDecision
  )

  $Text = $Lines -join "`r`n"
  $Text | Set-Content -Path $Path -Encoding UTF8

  $Current = Write-CurrentHandoff -AutoOpsRoot $AutoOpsRoot -Text $Text -Status $Status

  if ($Status -eq "QA_BLOCKED" -or $Status -eq "BLOCKED") {
    Copy-Item -Path $Path -Destination (Join-Path $NeedsAttention (Split-Path $Path -Leaf)) -Force
  }

  return [ordered]@{
    path = $Path
    currentHandoff = $Current.handoffPath
    currentPrompt = $Current.promptPath
    text = $Text
  }
}

function Test-ExistingQaBlocked {
  param(
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$PhaseName,
    [string]$RunId = ""
  )

  $HandoffDir = Join-Path $AutoOpsRoot "06_handoff"
  if (!(Test-Path -LiteralPath $HandoffDir)) { return $false }

  $Files = Get-ChildItem -Path $HandoffDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*$PhaseName*" -and $_.Name -like "*QA_BLOCKED.md" }

  if ($RunId) {
    $Files = $Files | Where-Object { (Get-Content $_.FullName -Raw) -like "*$RunId*" }
  }

  return [bool]($Files | Select-Object -First 1)
}

function Invoke-QaGuaranteeCloseout {
  param(
    [Parameter(Mandatory=$true)][string]$RepoRoot,
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$PhaseName,
    [Parameter(Mandatory=$true)][string]$Branch,
    [Parameter(Mandatory=$true)][string]$Verifier,
    [string]$PassHandoffPath = "",
    [string]$MergePendingPath = ""
  )

  $Control = Join-Path $AutoOpsRoot "00_control_center"
  $Evidence = Join-Path $Control "evidence"
  $QaDir = Join-Path $Evidence ("phase163-qa-hard-stop-" + (Get-Date -Format "yyyyMMdd_HHmmss"))
  New-SeraDirectory @($Evidence,$QaDir)

  Set-Location -LiteralPath $RepoRoot

  if (Test-ExistingQaBlocked -AutoOpsRoot $AutoOpsRoot -PhaseName $PhaseName) {
    $Handoff = Write-TerminalHandoff -Status "QA_BLOCKED" -PhaseName $PhaseName -Branch $Branch -AutoOpsRoot $AutoOpsRoot `
      -Summary "QA Guarantee refused to continue because an existing QA_BLOCKED handoff exists for this phase." `
      -EvidencePath $QaDir -Reason "existing_QA_BLOCKED_blocks_PASS_GUARANTEED" `
      -MergeDecision "MERGE_PENDING movement blocked."
    exit 2
  }

  if (!(Test-Path -LiteralPath $Verifier)) {
    $Handoff = Write-TerminalHandoff -Status "QA_BLOCKED" -PhaseName $PhaseName -Branch $Branch -AutoOpsRoot $AutoOpsRoot `
      -Summary "QA Guarantee verifier was missing." -EvidencePath $QaDir -Reason "missing_verifier" `
      -MergeDecision "MERGE_PENDING movement blocked."
    exit 2
  }

  $VerifierLog = Join-Path $QaDir "verifier-output.txt"
  $Output = & powershell -NoProfile -ExecutionPolicy Bypass -File $Verifier 2>&1
  $Exit = $LASTEXITCODE
  $Text = ($Output | Out-String)
  $Text | Set-Content -Path $VerifierLog -Encoding UTF8

  $Decision = Get-VerifierDecision -OutputText $Text -ExitCode $Exit

  $DecisionPath = Join-Path $QaDir "qa-decision.json"
  $Decision | ConvertTo-Json -Depth 20 | Set-Content -Path $DecisionPath -Encoding UTF8

  if (!$Decision.ok) {
    $Handoff = Write-TerminalHandoff -Status "QA_BLOCKED" -PhaseName $PhaseName -Branch $Branch -AutoOpsRoot $AutoOpsRoot `
      -Summary "QA Guarantee verifier did not produce a trusted explicit PASS. The flow stopped before PASS_GUARANTEED, merge approval movement, and closeout runner start." `
      -EvidencePath $DecisionPath -VerifierLog $VerifierLog -Reason $Decision.reason `
      -MergeDecision "MERGE_PENDING movement blocked. Closeout runner not started."
    exit 2
  }

  $EvidencePath = Join-Path $QaDir "PASS_GUARANTEED-evidence.json"
  $EvidenceObj = [ordered]@{
    ok = $true
    status = "PASS_GUARANTEED"
    phaseName = $PhaseName
    branch = $Branch
    verifier = $Verifier
    verifierLog = $VerifierLog
    decisionPath = $DecisionPath
    passHandoff = $PassHandoffPath
    mergePending = $MergePendingPath
    safeAutoMergeEligible = $true
    ownerBoundaryTriggered = $false
    mergeDecision = "PASS_GUARANTEED allowed; external runner may move MERGE_PENDING only after this evidence."
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
  }
  $EvidenceObj | ConvertTo-Json -Depth 20 | Set-Content -Path $EvidencePath -Encoding UTF8

  $Handoff = Write-TerminalHandoff -Status "PASS_GUARANTEED" -PhaseName $PhaseName -Branch $Branch -AutoOpsRoot $AutoOpsRoot `
    -Summary "QA Guarantee verifier produced a trusted explicit PASS. PASS_GUARANTEED is allowed." `
    -EvidencePath $EvidencePath -VerifierLog $VerifierLog -Reason $Decision.reason `
    -MergeDecision "Safe auto-approval may proceed only if owner boundaries remain false."

  return $Handoff
}

if ($SelfTest) {
  $Temp = Join-Path ([System.IO.Path]::GetTempPath()) ("sera-phase163-selftest-" + [guid]::NewGuid().ToString("N"))
  New-SeraDirectory @($Temp)

  $Pass = Get-VerifierDecision -OutputText '{"status":"PASS"}' -ExitCode 0
  $FailExit = Get-VerifierDecision -OutputText '{"status":"PASS"}' -ExitCode 1
  $Native = Get-VerifierDecision -OutputText 'NativeCommandError parameter cannot be found {"status":"PASS"}' -ExitCode 0
  $NoPass = Get-VerifierDecision -OutputText '{"status":"READY"}' -ExitCode 0

  $Failures = @()
  if (!$Pass.ok -or $Pass.status -ne "PASS_GUARANTEED") { $Failures += "explicit PASS should allow PASS_GUARANTEED" }
  if ($FailExit.ok -or $FailExit.status -ne "QA_BLOCKED") { $Failures += "nonzero exit should QA_BLOCK" }
  if ($Native.ok -or $Native.reason -ne "verifier_error_text_detected") { $Failures += "NativeCommandError should QA_BLOCK" }
  if ($NoPass.ok -or $NoPass.reason -ne "missing_explicit_status_PASS") { $Failures += "missing explicit PASS should QA_BLOCK" }

  $QaBlocked = Write-TerminalHandoff -Status "QA_BLOCKED" -PhaseName "phase163-selftest" -Branch "selftest" -AutoOpsRoot $Temp `
    -Summary "Self-test QA_BLOCKED terminal packet." -Reason "selftest"
  $HasBlocked = Test-ExistingQaBlocked -AutoOpsRoot $Temp -PhaseName "phase163-selftest"
  if (!$HasBlocked) { $Failures += "existing QA_BLOCKED guard did not detect handoff" }

  if ($Failures.Count -gt 0) {
    [ordered]@{
      phase = 163
      status = "FAIL"
      failures = $Failures
    } | ConvertTo-Json -Depth 20
    exit 1
  }

  [ordered]@{
    phase = 163
    status = "PASS"
    verifier = "phase163-qa-guarantee-hard-stop-integrity-hotfix-v1"
    checks = @(
      "explicit PASS allows PASS_GUARANTEED",
      "nonzero verifier creates QA_BLOCKED",
      "NativeCommandError creates QA_BLOCKED",
      "missing explicit status PASS creates QA_BLOCKED",
      "existing QA_BLOCKED prevents PASS_GUARANTEED",
      "CURRENT_CHATGPT_HANDOFF written for terminal states",
      "single-script fail-closed behavior available"
    )
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json -Depth 20
  exit 0
}

Invoke-QaGuaranteeCloseout -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot -PhaseName $PhaseName -Branch $Branch -Verifier $Verifier -PassHandoffPath $PassHandoffPath -MergePendingPath $MergePendingPath
