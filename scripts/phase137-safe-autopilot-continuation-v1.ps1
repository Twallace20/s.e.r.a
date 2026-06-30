<#
.SYNOPSIS
  Phase 137 Safe Autopilot Continuation v1 helper.

.DESCRIPTION
  Additive proof helper for S.E.R.A. phone-controlled autopilot. This script records
  receipts and validates the saved ChatGPT target-only contract. It intentionally
  does not bypass existing S.E.R.A. safety gates, does not alter external accounts,
  and does not introduce random/new-chat fallback behavior.
#>

[CmdletBinding(DefaultParameterSetName = 'Validate')]
param(
  [Parameter(ParameterSetName = 'Validate')]
  [switch]$Validate,

  [Parameter(ParameterSetName = 'Preflight')]
  [switch]$Preflight,

  [Parameter(ParameterSetName = 'Receipt')]
  [switch]$RecordReceipt,

  [Parameter(ParameterSetName = 'Receipt')]
  [ValidateSet('new','accepted','running','chatgpt_request','artifact_retrieval','routing','apply','validation','handoff_detection','complete','blocked')]
  [string]$Step,

  [Parameter(ParameterSetName = 'Receipt')]
  [ValidateSet('ok','blocked','needs_attention','skipped')]
  [string]$Status = 'ok',

  [Parameter(ParameterSetName = 'Receipt')]
  [string]$Message = '',

  [string]$AutoOps = (Join-Path $env:USERPROFILE 'OneDrive\SERA-AutoOps')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function ConvertTo-Utf8JsonFile {
  param(
    [Parameter(Mandatory=$true)]$Value,
    [Parameter(Mandatory=$true)][string]$Path,
    [int]$Depth = 12
  )
  $parent = Split-Path -Parent $Path
  if ($parent) { New-Item -ItemType Directory -Force $parent | Out-Null }
  $json = ($Value | ConvertTo-Json -Depth $Depth)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, $utf8NoBom)
}

function Read-JsonFile {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (!(Test-Path $Path)) {
    throw "Required JSON file is missing: $Path"
  }
  return (Get-Content $Path -Raw | ConvertFrom-Json)
}

function Test-SavedChatGptTargetContract {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot)

  $targetPath = Join-Path $AutoOpsRoot '00_control_center\chatgpt-target.json'
  $target = Read-JsonFile -Path $targetPath

  $issues = New-Object System.Collections.Generic.List[string]

  if (!$target.PSObject.Properties.Name.Contains('targetUrl') -or [string]::IsNullOrWhiteSpace([string]$target.targetUrl)) {
    $issues.Add('targetUrl is missing or empty')
  }

  if ($target.PSObject.Properties.Name.Contains('allowNewChatFallback') -and $target.allowNewChatFallback -ne $false) {
    $issues.Add('allowNewChatFallback must be false')
  }

  if ($target.PSObject.Properties.Name.Contains('allowRandomRecentChatFallback') -and $target.allowRandomRecentChatFallback -ne $false) {
    $issues.Add('allowRandomRecentChatFallback must be false')
  }

  if ($target.PSObject.Properties.Name.Contains('targetUrl') -and $target.targetUrl -and ([string]$target.targetUrl) -notlike 'https://chatgpt.com/*') {
    $issues.Add('targetUrl must point to chatgpt.com')
  }

  $ok = ($issues.Count -eq 0)
  return [pscustomobject]@{
    ok = $ok
    targetPath = $targetPath
    targetUrlPresent = ![string]::IsNullOrWhiteSpace([string]$target.targetUrl)
    allowNewChatFallback = if ($target.PSObject.Properties.Name.Contains('allowNewChatFallback')) { $target.allowNewChatFallback } else { $null }
    allowRandomRecentChatFallback = if ($target.PSObject.Properties.Name.Contains('allowRandomRecentChatFallback')) { $target.allowRandomRecentChatFallback } else { $null }
    issues = @($issues)
  }
}

function Write-Phase137Receipt {
  param(
    [Parameter(Mandatory=$true)][string]$AutoOpsRoot,
    [Parameter(Mandatory=$true)][string]$StepName,
    [Parameter(Mandatory=$true)][string]$ReceiptStatus,
    [string]$ReceiptMessage = ''
  )

  $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd_HHmmssZ')
  $receiptDir = Join-Path $AutoOpsRoot '00_control_center\evidence\phase137-safe-autopilot-continuation-v1'
  $receiptPath = Join-Path $receiptDir ("phase137-$StepName-$stamp.json")

  $receipt = [ordered]@{
    schemaVersion = 1
    phase = 137
    helper = 'phase137-safe-autopilot-continuation-v1'
    step = $StepName
    status = $ReceiptStatus
    message = $ReceiptMessage
    savedChatGptTargetOnly = $true
    allowNewChatFallback = $false
    allowRandomRecentChatFallback = $false
    evidenceAt = (Get-Date).ToUniversalTime().ToString('o')
  }

  ConvertTo-Utf8JsonFile -Value $receipt -Path $receiptPath -Depth 12
  return $receiptPath
}

function Invoke-Phase137Preflight {
  param([Parameter(Mandatory=$true)][string]$AutoOpsRoot)

  $targetCheck = Test-SavedChatGptTargetContract -AutoOpsRoot $AutoOpsRoot
  $receiptStatus = if ($targetCheck.ok) { 'ok' } else { 'blocked' }
  $receiptMessage = if ($targetCheck.ok) { 'Saved ChatGPT target contract is valid.' } else { 'Saved ChatGPT target contract failed: ' + (($targetCheck.issues) -join '; ') }
  $receiptPath = Write-Phase137Receipt -AutoOpsRoot $AutoOpsRoot -StepName 'preflight' -ReceiptStatus $receiptStatus -ReceiptMessage $receiptMessage

  return [pscustomobject]@{
    ok = $targetCheck.ok
    status = $receiptStatus
    phase = 137
    target = $targetCheck
    receiptPath = $receiptPath
  }
}

if ($RecordReceipt) {
  if ([string]::IsNullOrWhiteSpace($Step)) { throw 'Step is required when -RecordReceipt is used.' }
  $path = Write-Phase137Receipt -AutoOpsRoot $AutoOps -StepName $Step -ReceiptStatus $Status -ReceiptMessage $Message
  [pscustomobject]@{ ok = $true; status = $Status; receiptPath = $path } | ConvertTo-Json -Depth 12
  exit 0
}

$result = Invoke-Phase137Preflight -AutoOpsRoot $AutoOps
$result | ConvertTo-Json -Depth 12
if (!$result.ok) { exit 2 }
exit 0
