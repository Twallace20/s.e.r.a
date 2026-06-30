param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$ExpectedZipFilename = "s.e.r.a_phase142_autoops_extraction_intake_self_test_continuation_queue_v1_overlay.zip",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

$Phase = 142
$PhaseSlug = "phase142_autoops_extraction_intake_self_test_continuation_queue_v1"

$GuardDir = Join-Path $AutoOpsRoot "00_control_center\runtime_guard"
$EvidenceDir = Join-Path $AutoOpsRoot "00_control_center\evidence"
$QueueDir = Join-Path $AutoOpsRoot "00_control_center\queue"
$ContinuationDir = Join-Path $AutoOpsRoot "00_control_center\continuation_packets"

$GuardPath = Join-Path $GuardDir "phase142-autoops-extraction-intake-self-test-continuation-queue-v1.json"
$EvidencePath = Join-Path $EvidenceDir ("phase142-autoops-extraction-intake-self-test-continuation-queue-v1-{0}.json" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
$QueuePolicyPath = Join-Path $QueueDir "phase142-continuation-queue-policy.json"

$Policy = [ordered]@{
  schemaVersion = 1
  phase = $Phase
  phaseSlug = $PhaseSlug
  expectedZipFilename = $ExpectedZipFilename

  extractionIntake = @{
    zipExtractionSelfTestBeforeBranchCreation = $true
    manifestLookupRequiredBeforeGitBranchMutation = $true
    expectedRoot = "repo/"
    expectedManifest = "repo/.overlay/phase142_autoops_extraction_intake_self_test_continuation_queue_v1.json"
    badZipOutcome = "BLOCKED_PACKET_WITH_EXTRACTED_CONTENT_LIST"
    branchExistsOutcome = "SWITCH_AND_REUSE_BRANCH_IF_CLEAN"
    dirtyBranchOutcome = "BLOCKED_PACKET"
  }

  commandLock = @{
    oneActiveCommandOnly = $true
    activeCommandFields = @(
      "activeCommandId",
      "activePhase",
      "activeRunNonce",
      "expectedZipFilename",
      "startedAt",
      "status"
    )
  }

  continuationQueue = @{
    batchJsonSupport = $true
    sequentialQueueSupport = $true
    stopOnBlocked = $true
    requireClosedCleanlyBeforeNext = $true
    continuationPacketRequiredOnBlocked = $true
    blockedRecoveryTypes = @(
      "fixed_overlay",
      "hotfix_overlay",
      "manual_rescue",
      "rollback_only_when_required"
    )
  }

  handoffMatching = @{
    staleHandoffCompletionAllowed = $false
    requiredMatchFields = @(
      "commandId",
      "expectedZipFilename",
      "runNonce",
      "phaseSlug"
    )
  }

  routingEvidence = @{
    downloadCompletionEvidenceRequired = $true
    requiredFields = @(
      "expectedZipFilename",
      "finalLocalPath",
      "sha256",
      "routeAction",
      "sourceFolder",
      "destinationFolder",
      "fileStable",
      "routedAt"
    )
  }

  phoneAutopilot = @{
    guardedSinglePhaseAllowed = $true
    guardedSequentialBatchAllowed = $true
    unattendedMultiPhaseAllowed = $false
    savedChatGptTargetOnly = $true
    allowRandomRecentChatFallback = $false
    allowNewChatFallback = $false
  }

  safety = @{
    noCredentials = $true
    noTokens = $true
    noPaidServices = $true
    noGithubSettingsChanges = $true
    noOwnerControlBoundaryChanges = $true
    noSelfMerge = $true
    noProductionDeployment = $true
    noSilentAutoMergeWithoutApprovalSourceEvidence = $true
  }

  generatedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
}

if ($Apply) {
  New-Item -ItemType Directory -Force $GuardDir | Out-Null
  New-Item -ItemType Directory -Force $EvidenceDir | Out-Null
  New-Item -ItemType Directory -Force $QueueDir | Out-Null
  New-Item -ItemType Directory -Force $ContinuationDir | Out-Null

  $Policy | ConvertTo-Json -Depth 30 | Set-Content -Path $GuardPath -Encoding UTF8

  $QueuePolicy = [ordered]@{
    schemaVersion = 1
    phase = $Phase
    mode = "guarded_sequential_queue"
    oneActiveCommandOnly = $true
    stopOnBlocked = $true
    requireClosedCleanlyBeforeNext = $true
    staleHandoffCompletionAllowed = $false
    blockedContinuationPacketDirectory = $ContinuationDir
    sampleBatchJson = @{
      mode = "phase_batch"
      phases = @(142, 143, 144)
      stopOnBlocked = $true
      requireClosedCleanlyBeforeNext = $true
      oneActiveCommandOnly = $true
    }
    writtenAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  }

  $QueuePolicy | ConvertTo-Json -Depth 30 | Set-Content -Path $QueuePolicyPath -Encoding UTF8
}

$Evidence = [ordered]@{
  ok = $true
  phase = $Phase
  phaseSlug = $PhaseSlug
  mode = if ($Apply) { "apply" } else { "dry-run" }
  guardPath = $GuardPath
  queuePolicyPath = $QueuePolicyPath
  evidencePath = $EvidencePath
  expectedZipFilename = $ExpectedZipFilename
  zipExtractionSelfTestBeforeBranchCreation = $true
  manifestLookupRequiredBeforeGitBranchMutation = $true
  branchExistsOutcome = "SWITCH_AND_REUSE_BRANCH_IF_CLEAN"
  oneActiveCommandOnly = $true
  batchJsonSupport = $true
  sequentialQueueSupport = $true
  stopOnBlocked = $true
  requireClosedCleanlyBeforeNext = $true
  continuationPacketRequiredOnBlocked = $true
  staleHandoffCompletionAllowed = $false
  downloadCompletionEvidenceRequired = $true
  safety = $Policy.safety
  createdAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
}

if ($Apply) {
  $Evidence | ConvertTo-Json -Depth 30 | Set-Content -Path $EvidencePath -Encoding UTF8
}

$Evidence | ConvertTo-Json -Depth 30
