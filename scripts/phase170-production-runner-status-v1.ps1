param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$PhaseToken = "phase170"
$PhaseSlug = "phase170_production_runner_json_pickup_fix_v1"
$ExpectedZip = "s.e.r.a_phase170_production_runner_json_pickup_fix_v1_overlay.zip"

Write-Host "Phase170 production runner JSON pickup fix status"
Write-Host "phaseSlug=$PhaseSlug"
Write-Host "expectedZip=$ExpectedZip"
Write-Host "command_inbox=$(Join-Path $Control 'command_inbox')"
Write-Host "REQUEST_READY artifact=$(Join-Path $Control 'artifact-watch-request.json')"
Write-Host "WAITING_FOR_ZIP path=$(Join-Path $Downloads13 $ExpectedZip)"
Write-Host "PRODUCTION_JSON_PICKUP_FAILED diagnostics:"
Get-ChildItem $Control -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "PHASE170_PRODUCTION_JSON_PICKUP_DIAGNOSTIC_*.md" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 5 FullName,LastWriteTime,Length |
  Format-Table -AutoSize
Write-Host "Phase170 handoffs:"
Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*$PhaseToken*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 10 Name,LastWriteTime,Length |
  Format-Table -AutoSize
Write-Host "Phase170 bridge prompts:"
Get-ChildItem $BridgeOutbox -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like "*$PhaseToken*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 10 FullName,LastWriteTime,Length |
  Format-Table -AutoSize
Write-Host "PASS_GUARANTEED and CLOSED_CLEANLY are required for completion."
