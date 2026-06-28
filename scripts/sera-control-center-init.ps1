param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$AutoOps = if ($env:SERA_AUTOOPS_DIR) { $env:SERA_AUTOOPS_DIR } else { Join-Path $env:USERPROFILE "OneDrive\SERA-AutoOps" }
$Control = Join-Path $AutoOps "00_control_center"
New-Item -ItemType Directory -Force $Control | Out-Null
foreach ($name in @("approvals","needs_attention","phase_missions","directives","services","evidence","archive","pause","stop")) {
  New-Item -ItemType Directory -Force (Join-Path $Control $name) | Out-Null
}
function Write-JsonIfMissing($Path, $Object) {
  if ((Test-Path $Path) -and -not $Force) { return }
  $Object | ConvertTo-Json -Depth 20 | Set-Content -Path $Path -Encoding UTF8
}
Write-JsonIfMissing (Join-Path $Control "autopilot-state.json") @{
  schemaVersion = 1
  version = "phase118-autopilot-governor-control-center-v1"
  autopilot = "guarded"
  enabled = $false
  phaseRange = @{ start = 118; end = 140 }
  maxConsecutivePhases = 1
  maxRepairAttemptsPerPhase = 2
  stopOnNeedsAttention = $true
  allowSafeAutoMerge = $true
  allowNewChatFallback = $false
  allowRandomRecentChatFallback = $false
  requireSavedChatTarget = $true
}
Write-JsonIfMissing (Join-Path $Control "phase-mission.json") @{
  schemaVersion = 1
  currentPhase = 118
  phaseRange = @{ start = 118; end = 140 }
  mission = "Continue S.E.R.A. guarded autopilot hardening with owner-safe control center governance."
}
Write-JsonIfMissing (Join-Path $Control "service-registry.json") @{
  schemaVersion = 1
  services = @{
    chatgptBridge = @{ enabled = $true; requiresSavedTarget = $true }
    downloadRouter = @{ enabled = $true; intake = "13_chatgpt_downloads" }
    autoOpsRunner = @{ enabled = $true; validatesWith = "npm run sera:gate" }
    safeMergeAutoApprover = @{ enabled = $true; requiresOwnerMergeApprovalFile = $true }
  }
}
$Target = Join-Path $Control "chatgpt-target.json"
$Legacy = Join-Path $AutoOps "12_browser_helper_state\chatgpt-bridge-target.json"
if (!(Test-Path $Target) -or $Force) {
  if (Test-Path $Legacy) {
    $json = Get-Content $Legacy -Raw | ConvertFrom-Json
    $json | Add-Member -NotePropertyName controlCenterManaged -NotePropertyValue $true -Force
    $json.allowNewChatFallback = $false
    $json.allowRandomRecentChatFallback = $false
    $json | ConvertTo-Json -Depth 20 | Set-Content -Path $Target -Encoding UTF8
  } else {
    @{
      targetName = "S.E.R.A. saved ChatGPT thread"
      targetUrl = "OWNER_SET_CHATGPT_THREAD_URL"
      cdpEndpoint = "http://127.0.0.1:9222"
      allowNewChatFallback = $false
      allowRandomRecentChatFallback = $false
      composerSelectors = @()
    } | ConvertTo-Json -Depth 20 | Set-Content -Path $Target -Encoding UTF8
  }
}
$Directives = Join-Path $Control "directives.md"
if (!(Test-Path $Directives) -or $Force) {
@'
# S.E.R.A. Control Center Directives

- Use guarded autopilot.
- Use only the saved ChatGPT target URL.
- Stop on unclear, destructive, paid, security-sensitive, or owner-risk actions.
- Keep owner approval required for merge, high-risk repairs, and external service changes.
'@ | Set-Content -Path $Directives -Encoding UTF8
}
Write-Host "Control center initialized: $Control"
node scripts/sera-autopilot-governor.mjs --init
