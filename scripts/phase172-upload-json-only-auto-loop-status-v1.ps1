param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$Control = Join-Path $AutoOpsRoot "00_control_center"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"

Write-Host "SERA Phase172 Auto Loop Status"
Write-Host "Repo: $RepoRoot"
Write-Host "AutoOps: $AutoOpsRoot"

if (Test-Path (Join-Path $Control "artifact-watch-request.json")) {
  Write-Host ""
  Write-Host "Artifact request:"
  Get-Content (Join-Path $Control "artifact-watch-request.json") -Raw
}

Write-Host ""
Write-Host "Latest handoffs:"
Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 10 FullName,LastWriteTime,Length |
  Format-Table -AutoSize
