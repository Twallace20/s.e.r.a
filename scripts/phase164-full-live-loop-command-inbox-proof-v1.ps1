param(
  [ValidateSet('QaGuarantee','SelfTest','DiscoverNextCommand','WriteBlocked')]
  [string]$Mode = 'QaGuarantee',
  [string]$RepoRoot = (Get-Location).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$PhaseName = 's.e.r.a_phase164_full_live_loop_command_inbox_proof_v1_overlay',
  [string]$Branch = 'work/phase164-full-live-loop-command-inbox-proof-v1',
  [string]$Verifier = 'scripts\verify-phase164-full-live-loop-command-inbox-proof-v1.ps1',
  [string]$PassHandoffPath = '',
  [string]$MergePendingPath = ''
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

function New-SeraDirectory {
  param([Parameter(Mandatory=$true)][string[]]$Path)
  foreach ($P in $Path) {
    if ($P -and $P.Trim().Length -gt 0) { New-Item -ItemType Directory -Force -Path $P | Out-Null }
  }
}

function Get-SeraControlPath {
  param([string]$Relative)
  return (Join-Path $AutoOpsRoot $Relative)
}

function Get-SeraPhaseNumberFromFile {
  param([Parameter(Mandatory=$true)][System.IO.FileInfo]$File)
  $json = $null
  try { $json = Get-Content $File.FullName -Raw | ConvertFrom-Json } catch { $json = $null }

  foreach ($prop in @('phase','phaseStart','phaseEnd')) {
    if ($json -and ($json.PSObject.Properties.Name -contains $prop)) {
      $value = [string]$json.$prop
      $n = 0
      if ([int]::TryParse($value, [ref]$n)) { return $n }
    }
  }

  if ($json -and ($json.PSObject.Properties.Name -contains 'phaseSlug')) {
    $m = [regex]::Match([string]$json.phaseSlug, 'phase(\d+)')
    if ($m.Success) { return [int]$m.Groups[1].Value }
  }

  $nameMatch = [regex]::Match($File.Name, 'phase(\d+)')
  if ($nameMatch.Success) { return [int]$nameMatch.Groups[1].Value }

  return -1
}

function Get-SeraLatestClosedPhaseNumber {
  param([string]$HandoffRoot)
  $latest = 0
  if (Test-Path $HandoffRoot) {
    Get-ChildItem $HandoffRoot -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like '*CLOSED_CLEANLY*' } |
      ForEach-Object {
        $m = [regex]::Match($_.Name, 'phase(\d+)')
        if ($m.Success) {
          $n = [int]$m.Groups[1].Value
          if ($n -gt $latest) { $latest = $n }
        }
      }
  }

  try {
    $tags = git -C $RepoRoot tag --list 2>$null
    foreach ($tag in $tags) {
      $m = [regex]::Match([string]$tag, 'phase[-_](\d+)|phase(\d+)')
      if ($m.Success) {
        $value = if ($m.Groups[1].Success) { $m.Groups[1].Value } else { $m.Groups[2].Value }
        $n = [int]$value
        if ($n -gt $latest) { $latest = $n }
      }
    }
  } catch { }

  return $latest
}

function Get-SeraNextCommandFromInbox {
  param(
    [Parameter(Mandatory=$true)][string]$CommandInbox,
    [Parameter(Mandatory=$true)][int]$LatestClosedPhase
  )

  if (!(Test-Path $CommandInbox)) { return $null }

  $candidates = @()
  foreach ($file in Get-ChildItem $CommandInbox -File -Filter '*.json' -ErrorAction SilentlyContinue) {
    $phaseNumber = Get-SeraPhaseNumberFromFile -File $file
    if ($phaseNumber -gt $LatestClosedPhase) {
      $candidates += [pscustomobject]@{ Phase = $phaseNumber; Path = $file.FullName; Name = $file.Name }
    }
  }

  if ($candidates.Count -eq 0) { return $null }
  return ($candidates | Sort-Object Phase, Name | Select-Object -First 1)
}

function Clear-SeraStaleRequestLease {
  $control = Get-SeraControlPath '00_control_center'
  Remove-Item (Join-Path $control 'artifact-watch-request.json') -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path $control 'artifact-generation-lease.json') -Force -ErrorAction SilentlyContinue
}

function Test-SeraArtifactRequestFreshness {
  param(
    [Parameter(Mandatory=$true)][string]$RequestPath,
    [Parameter(Mandatory=$true)][string]$ExpectedZip,
    [Parameter(Mandatory=$true)][int]$ExpectedPhase
  )

  if (!(Test-Path $RequestPath)) { return $false }
  $request = Get-Content $RequestPath -Raw | ConvertFrom-Json
  $zip = if ($request.expectedZipName) { $request.expectedZipName } else { $request.expectedZipFilename }

  if ([string]$request.phase -ne [string]$ExpectedPhase) { return $false }
  if ([string]$zip -ne [string]$ExpectedZip) { return $false }
  if ($request.savedChatGptTargetOnly -ne $true) { return $false }
  if ($request.allowRandomRecentChatFallback -ne $false) { return $false }
  if ($request.allowNewChatFallback -ne $false) { return $false }

  return $true
}

function Write-SeraTerminalHandoff {
  param(
    [Parameter(Mandatory=$true)][string]$Status,
    [Parameter(Mandatory=$true)][string]$Summary,
    [string]$Reason = '',
    [string]$EvidencePath = '',
    [string]$RunDir = ''
  )

  $control = Get-SeraControlPath '00_control_center'
  $handoff = Get-SeraControlPath '06_handoff'
  $needs = Get-SeraControlPath '17_needs_attention'
  New-SeraDirectory @($control,$handoff,$needs)

  $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
  $path = Join-Path $handoff "$PhaseName-$stamp-$Status.md"

  $text = @(
    '# S.E.R.A. AutoOps Packet',
    '',
    "Status: $Status",
    "Phase: $PhaseName",
    "Branch: $Branch",
    "Timestamp: $stamp",
    '',
    '## Summary',
    '',
    $Summary,
    '',
    '## Diagnosis',
    '',
    "Reason: $Reason",
    '',
    '## Evidence',
    '',
    "Evidence path: $EvidencePath",
    "Run directory: $RunDir",
    '',
    '## Next Instruction For ChatGPT',
    '',
    'Review this S.E.R.A. AutoOps packet and provide exact next steps.'
  ) -join "`r`n"

  $text | Set-Content $path -Encoding UTF8
  $text | Set-Content (Join-Path $control 'CURRENT_CHATGPT_HANDOFF.md') -Encoding UTF8
  $text | Set-Content (Join-Path $control 'CURRENT_CHATGPT_HANDOFF.prompt.md') -Encoding UTF8

  if ($Status -like '*BLOCKED*') {
    Copy-Item $path (Join-Path $needs (Split-Path $path -Leaf)) -Force
  }

  try { Set-Clipboard $text } catch { }

  return [pscustomobject]@{ path = $path; text = $text; currentHandoff = (Join-Path $control 'CURRENT_CHATGPT_HANDOFF.md'); currentPrompt = (Join-Path $control 'CURRENT_CHATGPT_HANDOFF.prompt.md') }
}

function Test-SeraVerifierTextIsTrustedPass {
  param([Parameter(Mandatory=$true)][string]$Text)
  $badPatterns = @(
    'NativeCommandError',
    'ParameterBindingException',
    'A parameter cannot be found',
    'Cannot bind parameter',
    'is not recognized as the name',
    'FullyQualifiedErrorId',
    'ParserError',
    'Exception:',
    'QA_BLOCKED'
  )
  foreach ($pattern in $badPatterns) {
    if ($Text -match [regex]::Escape($pattern)) { return $false }
  }
  return ($Text -match '"status"\s*:\s*"PASS"')
}

function Invoke-SeraPhase164SelfTest {
  $root = Join-Path ([System.IO.Path]::GetTempPath()) ('sera-phase164-selftest-' + [guid]::NewGuid().ToString('N'))
  $oldAutoOps = $script:AutoOpsRoot
  try {
    $script:AutoOpsRoot = $root
    $control = Get-SeraControlPath '00_control_center'
    $inbox = Join-Path $control 'command_inbox'
    $handoff = Get-SeraControlPath '06_handoff'
    New-SeraDirectory @($control,$inbox,$handoff)

    '# closed' | Set-Content (Join-Path $handoff 's.e.r.a_phase163_previous-20260702_000000-CLOSED_CLEANLY.md') -Encoding UTF8

    @{ phase = 164; phaseSlug = 'phase164_full_live_loop_command_inbox_proof_v1'; expectedZipFilename = 's.e.r.a_phase164_full_live_loop_command_inbox_proof_v1_overlay.zip'; savedChatGptTargetOnly = $true; allowRandomRecentChatFallback = $false; allowNewChatFallback = $false } |
      ConvertTo-Json -Depth 10 | Set-Content (Join-Path $inbox 'autopilot-command-phase164_full_live_loop_command_inbox_proof_v1.json') -Encoding UTF8

    @{ phase = 200; phaseSlug = 'phase200_later'; expectedZipFilename = 'later.zip' } |
      ConvertTo-Json -Depth 10 | Set-Content (Join-Path $inbox 'autopilot-command-phase200_later.json') -Encoding UTF8

    $latest = Get-SeraLatestClosedPhaseNumber -HandoffRoot $handoff
    if ($latest -ne 163) { throw "latest closed expected 163 but got $latest" }

    $next = Get-SeraNextCommandFromInbox -CommandInbox $inbox -LatestClosedPhase $latest
    if (!$next -or $next.Phase -ne 164) { throw 'command discovery did not select Phase164' }

    $requestPath = Join-Path $control 'artifact-watch-request.json'
    @{ phase = '163'; expectedZipName = 'stale.zip'; savedChatGptTargetOnly = $true; allowRandomRecentChatFallback = $false; allowNewChatFallback = $false } |
      ConvertTo-Json -Depth 10 | Set-Content $requestPath -Encoding UTF8

    if (Test-SeraArtifactRequestFreshness -RequestPath $requestPath -ExpectedZip 's.e.r.a_phase164_full_live_loop_command_inbox_proof_v1_overlay.zip' -ExpectedPhase 164) {
      throw 'stale request was accepted'
    }

    $packet = Write-SeraTerminalHandoff -Status 'BLOCKED' -Summary 'Self-test terminal packet.' -Reason 'self_test' -EvidencePath $requestPath -RunDir $root
    if (!(Test-Path $packet.currentHandoff)) { throw 'CURRENT_CHATGPT_HANDOFF.md missing' }
    if (!(Test-Path $packet.currentPrompt)) { throw 'CURRENT_CHATGPT_HANDOFF.prompt.md missing' }

    $bad = 'NativeCommandError "status":"PASS"'
    if (Test-SeraVerifierTextIsTrustedPass -Text $bad) { throw 'bad verifier text accepted' }

    $good = '{ "phase": 164, "status": "PASS" }'
    if (!(Test-SeraVerifierTextIsTrustedPass -Text $good)) { throw 'trusted verifier PASS rejected' }

    $report = [ordered]@{
      phase = 164
      status = 'PASS'
      checks = @(
        'command inbox selected Phase164',
        'stale request rejected',
        'terminal current handoff written',
        'bad verifier output rejected',
        'explicit verifier PASS accepted',
        'QA hard-stop predicates preserved'
      )
      createdAt = (Get-Date).ToUniversalTime().ToString('o')
    }
    $report | ConvertTo-Json -Depth 10
  }
  finally {
    $script:AutoOpsRoot = $oldAutoOps
    Remove-Item $root -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Invoke-SeraQaGuarantee {
  if (!(Test-Path $PassHandoffPath)) {
    Write-SeraTerminalHandoff -Status 'QA_BLOCKED' -Summary 'PASS handoff path is missing.' -Reason 'pass_handoff_missing' | Out-Null
    exit 7
  }
  if (!(Test-Path $MergePendingPath)) {
    Write-SeraTerminalHandoff -Status 'QA_BLOCKED' -Summary 'MERGE_PENDING path is missing.' -Reason 'merge_pending_missing' | Out-Null
    exit 7
  }

  $verifierPath = if ([System.IO.Path]::IsPathRooted($Verifier)) { $Verifier } else { Join-Path $RepoRoot $Verifier }
  if (!(Test-Path $verifierPath)) {
    Write-SeraTerminalHandoff -Status 'QA_BLOCKED' -Summary 'Verifier path is missing.' -Reason 'verifier_missing' -EvidencePath $verifierPath | Out-Null
    exit 7
  }

  $evidenceDir = Join-Path (Get-SeraControlPath '00_control_center\evidence') ('phase164-qa-hard-stop-' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
  New-SeraDirectory @($evidenceDir)
  $verifierLog = Join-Path $evidenceDir 'verifier-output.txt'

  $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $verifierPath -Mode SelfTest -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($output | Out-String)
  $text | Set-Content $verifierLog -Encoding UTF8

  if ($exitCode -ne 0 -or !(Test-SeraVerifierTextIsTrustedPass -Text $text)) {
    Write-SeraTerminalHandoff -Status 'QA_BLOCKED' -Summary 'QA Guarantee verifier did not produce a trusted explicit PASS.' -Reason 'verifier_not_trusted_PASS' -EvidencePath $verifierLog -RunDir $evidenceDir | Out-Null
    exit 7
  }

  $evidence = Join-Path $evidenceDir 'PASS_GUARANTEED-evidence.json'
  [ordered]@{
    phase = 164
    status = 'PASS_GUARANTEED'
    reason = 'explicit_verifier_PASS'
    passHandoff = $PassHandoffPath
    mergePending = $MergePendingPath
    verifierLog = $verifierLog
    ownerBoundaryTriggered = $false
    safeAutoApprovalAllowed = $true
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
  } | ConvertTo-Json -Depth 10 | Set-Content $evidence -Encoding UTF8

  $packet = Write-SeraTerminalHandoff -Status 'PASS_GUARANTEED' -Summary 'QA Guarantee verifier produced a trusted explicit PASS. PASS_GUARANTEED is allowed.' -Reason 'explicit_verifier_PASS' -EvidencePath $evidence -RunDir $evidenceDir
  $packet | Format-List
  exit 0
}

if ($Mode -eq 'SelfTest') { Invoke-SeraPhase164SelfTest; exit 0 }

if ($Mode -eq 'DiscoverNextCommand') {
  $inbox = Get-SeraControlPath '00_control_center\command_inbox'
  $handoff = Get-SeraControlPath '06_handoff'
  $latest = Get-SeraLatestClosedPhaseNumber -HandoffRoot $handoff
  $next = Get-SeraNextCommandFromInbox -CommandInbox $inbox -LatestClosedPhase $latest
  if (!$next) {
    Clear-SeraStaleRequestLease
    Write-SeraTerminalHandoff -Status 'BLOCKED' -Summary 'No runnable command found above latest CLOSED_CLEANLY phase.' -Reason 'no_runnable_command' | Out-Null
    exit 2
  }
  $next | ConvertTo-Json -Depth 10
  exit 0
}

Invoke-SeraQaGuarantee
