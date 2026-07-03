param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$BridgeOutbox = Join-Path $AutoOpsRoot "15_bridge_outbox"
Write-Host "=== Phase172 Auto Loop Status ==="
Write-Host "Current request:"
if (Test-Path (Join-Path $Control "artifact-watch-request.json")) { Get-Content (Join-Path $Control "artifact-watch-request.json") -Raw } else { Write-Host "No artifact-watch-request.json" }
Write-Host "Latest handoffs:"
Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10 FullName,LastWriteTime,Length | Format-Table -AutoSize
Write-Host "Latest bridge prompts:"
Get-ChildItem $BridgeOutbox -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10 FullName,LastWriteTime,Length | Format-Table -AutoSize
Write-Host "Latest downloads:"
Get-ChildItem $Downloads13 -File -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 10 FullName,LastWriteTime,Length | Format-Table -AutoSize
