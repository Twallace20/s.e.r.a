param(
  [ValidateSet("Normal", "Repair")]
  [string]$Mode = "Normal",

  [string]$NextPhaseNumber = "115",
  [string]$NextPhaseName = "Intentional Blocked Repair Loop Smoke Test v1"
)

$ErrorActionPreference = "Stop"

$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
$HandoffDir = "$AutoOps\06_handoff"
$OutboxDir = "$AutoOps\15_bridge_outbox"
$StateDir = "$AutoOps\12_browser_helper_state"
$NeedsAttentionDir = "$AutoOps\17_needs_attention"

New-Item -ItemType Directory -Path $OutboxDir, $NeedsAttentionDir -Force | Out-Null

function Write-NeedsAttention($Message) {
  $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $path = "$NeedsAttentionDir\PHASE114_PROMPT_BUILDER_NEEDS_ATTENTION-$timestamp.md"
  @(
    "# S.E.R.A. Phase 114 Prompt Builder Needs Attention",
    "",
    "Timestamp: $timestamp",
    "",
    "## Reason",
    "",
    $Message
  ) | Set-Content -Path $path -Encoding UTF8
  throw $Message
}

$targetPath = "$StateDir\chatgpt-bridge-target.json"
if (!(Test-Path $targetPath)) {
  Write-NeedsAttention "Missing saved ChatGPT bridge target: $targetPath"
}

$target = Get-Content $targetPath -Raw | ConvertFrom-Json
if ($target.allowNewChatFallback -ne $false) {
  Write-NeedsAttention "ChatGPT bridge target must set allowNewChatFallback=false."
}
if ($target.allowRandomRecentChatFallback -ne $false) {
  Write-NeedsAttention "ChatGPT bridge target must set allowRandomRecentChatFallback=false."
}
if (!$target.targetUrl -or $target.targetUrl -notlike "https://chatgpt.com/*") {
  Write-NeedsAttention "ChatGPT bridge targetUrl is missing or not a chatgpt.com URL."
}

$repo = Resolve-Path "."
$templateRoot = Join-Path $repo "docs\autopilot"

if ($Mode -eq "Normal") {
  $latest = Get-ChildItem $HandoffDir -File -Filter "*CLOSED_CLEANLY.md" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$latest) {
    Write-NeedsAttention "No CLOSED_CLEANLY handoff found for normal next-phase prompt."
  }

  $templatePath = Join-Path $templateRoot "NORMAL_PHASE_PROMPT_TEMPLATE.md"
  if (!(Test-Path $templatePath)) {
    Write-NeedsAttention "Missing normal phase prompt template: $templatePath"
  }

  $state = Get-Content $latest.FullName -Raw
  $template = Get-Content $templatePath -Raw
  $prompt = $template.Replace("{{CURRENT_STATE}}", $state).Replace("{{NEXT_PHASE_NUMBER}}", $NextPhaseNumber).Replace("{{NEXT_PHASE_NAME}}", $NextPhaseName)

  if ($prompt -notmatch "ZIP must use this root" -or $prompt -notmatch "repo/") {
    Write-NeedsAttention "Normal prompt is missing required repo/ ZIP root contract."
  }

  $safeName = ($NextPhaseName.ToLowerInvariant() -replace "[^a-z0-9]+", "-").Trim("-")
  $outPath = "$OutboxDir\phase$NextPhaseNumber-$safeName-normal-prompt.md"
  $prompt | Set-Content -Path $outPath -Encoding UTF8

  Write-Host "NORMAL_PROMPT_READY: $outPath"
  exit 0
}

if ($Mode -eq "Repair") {
  $blocked = Get-ChildItem $HandoffDir -File -Filter "*BLOCKED.md" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (!$blocked) {
    Write-NeedsAttention "No BLOCKED handoff found for repair prompt."
  }

  $templatePath = Join-Path $templateRoot "REPAIR_HOTFIX_PROMPT_TEMPLATE.md"
  if (!(Test-Path $templatePath)) {
    Write-NeedsAttention "Missing repair prompt template: $templatePath"
  }

  $packet = Get-Content $blocked.FullName -Raw
  $template = Get-Content $templatePath -Raw
  $prompt = $template.Replace("{{BLOCKED_PACKET}}", $packet)

  if ($prompt -notmatch "Do not invent" -and $prompt -notmatch "Do not invent missing") {
    Write-NeedsAttention "Repair prompt is missing anti-hallucination guardrail."
  }
  if ($prompt -notmatch "repo/") {
    Write-NeedsAttention "Repair prompt is missing required repo/ ZIP root contract."
  }

  $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
  $outPath = "$OutboxDir\repair-prompt-$timestamp.md"
  $prompt | Set-Content -Path $outPath -Encoding UTF8

  Write-Host "REPAIR_PROMPT_READY: $outPath"
  exit 0
}
