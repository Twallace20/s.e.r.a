[CmdletBinding()]
param([string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps")
$ErrorActionPreference = "Stop"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "sera-phase199-pointer-clean-repo-$Stamp"
$Archive = Join-Path $TempRoot "archive"
New-Item -ItemType Directory -Force $TempRoot, $Archive | Out-Null
Push-Location $TempRoot
try {
  git init | Out-Null
  git config user.email "phase199@sera.local" | Out-Null
  git config user.name "SERA Phase199" | Out-Null
  Set-Content -LiteralPath "CURRENT_PHASE_CLOSED_CLEANLY.md" -Value "committed baseline" -Encoding UTF8
  Set-Content -LiteralPath "CURRENT_PHASE_FINAL_HANDOFF.md" -Value "committed baseline" -Encoding UTF8
  git add CURRENT_PHASE_CLOSED_CLEANLY.md CURRENT_PHASE_FINAL_HANDOFF.md | Out-Null
  git commit -m "baseline pointer files" | Out-Null

  Set-Content -LiteralPath "CURRENT_PHASE_CLOSED_CLEANLY.md" -Value "dirty closed cleanly pointer" -Encoding UTF8
  Set-Content -LiteralPath "CURRENT_PHASE_FINAL_HANDOFF.md" -Value "dirty final handoff pointer" -Encoding UTF8

  $Dirty = git status --short
  if (!$Dirty) { throw "Simulation failed: pointer files were not dirty." }

  git diff -- CURRENT_PHASE_CLOSED_CLEANLY.md CURRENT_PHASE_FINAL_HANDOFF.md | Set-Content (Join-Path $Archive "current_phase_pointer_diff.patch") -Encoding UTF8
  Copy-Item .\CURRENT_PHASE_CLOSED_CLEANLY.md (Join-Path $Archive "CURRENT_PHASE_CLOSED_CLEANLY.md") -Force
  Copy-Item .\CURRENT_PHASE_FINAL_HANDOFF.md (Join-Path $Archive "CURRENT_PHASE_FINAL_HANDOFF.md") -Force
  git checkout -- CURRENT_PHASE_CLOSED_CLEANLY.md CURRENT_PHASE_FINAL_HANDOFF.md | Out-Null

  $Clean = git status --short
  if ($Clean) { throw "Pointer cleanup did not restore clean git status: $Clean" }
  foreach ($Rel in @("current_phase_pointer_diff.patch","CURRENT_PHASE_CLOSED_CLEANLY.md","CURRENT_PHASE_FINAL_HANDOFF.md")) {
    if (!(Test-Path -LiteralPath (Join-Path $Archive $Rel))) { throw "Missing archived pointer artifact: $Rel" }
  }
  Write-Host "PHASE199_POINTER_CLEAN_REPO_PROOF_PASS archive=$Archive"
  exit 0
} finally {
  Pop-Location
}
