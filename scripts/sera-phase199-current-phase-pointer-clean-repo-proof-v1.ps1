param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

function Get-RepoStatus {
  Push-Location $RepoRoot
  try {
    return @(git status --short --untracked-files=all)
  } finally {
    Pop-Location
  }
}

$Before = Get-RepoStatus
if ($Before.Count -gt 0) {
  throw "Clean repo proof requires clean starting status: $($Before -join '; ')"
}

$ClosedPointer = Join-Path $RepoRoot "CURRENT_PHASE_CLOSED_CLEANLY.md"
$HandoffPointer = Join-Path $RepoRoot "CURRENT_PHASE_FINAL_HANDOFF.md"

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ProofArchive = Join-Path $AutoOpsRoot "00_control_center\archive\phase199_pointer_cleanup_proof_$Stamp"
New-Item -ItemType Directory -Force $ProofArchive | Out-Null

Set-Content -LiteralPath $ClosedPointer -Value "simulated Phase199 CLOSED_CLEANLY pointer dirtiness" -Encoding UTF8
Set-Content -LiteralPath $HandoffPointer -Value "simulated Phase199 FINAL_HANDOFF pointer dirtiness" -Encoding UTF8

$Dirty = Get-RepoStatus
if ($Dirty -notcontains "?? CURRENT_PHASE_CLOSED_CLEANLY.md" -and $Dirty -notcontains "?? CURRENT_PHASE_FINAL_HANDOFF.md") {
  throw "Pointer proof did not create expected pointer-file dirtiness: $($Dirty -join '; ')"
}

Copy-Item -LiteralPath $ClosedPointer -Destination (Join-Path $ProofArchive "CURRENT_PHASE_CLOSED_CLEANLY.md") -Force
Copy-Item -LiteralPath $HandoffPointer -Destination (Join-Path $ProofArchive "CURRENT_PHASE_FINAL_HANDOFF.md") -Force

Remove-Item -LiteralPath $ClosedPointer -Force
Remove-Item -LiteralPath $HandoffPointer -Force

$After = Get-RepoStatus
if ($After.Count -gt 0) {
  throw "Pointer cleanup did not restore clean git status: $($After -join '; ')"
}

Write-Host "PHASE199_POINTER_CLEAN_REPO_PROOF_PASS archive=$ProofArchive"
exit 0
