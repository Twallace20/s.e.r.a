param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\")).Path,
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)
$ErrorActionPreference = "Stop"
function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args)
  Push-Location $RepoRoot
  try { return @(git @Args) } finally { Pop-Location }
}
function Get-RepoStatus { return @(Invoke-Git status --short --untracked-files=all) }
function Test-GitTracked([string]$RelPath) {
  $Tracked = @(Invoke-Git ls-files -- $RelPath)
  return ($Tracked.Count -gt 0)
}
function Restore-Pointer([string]$RelPath) {
  $Abs = Join-Path $RepoRoot $RelPath
  if (Test-GitTracked $RelPath) { Invoke-Git checkout -- $RelPath | Out-Null }
  elseif (Test-Path -LiteralPath $Abs) { Remove-Item -LiteralPath $Abs -Force }
}
$Before = Get-RepoStatus
if ($Before.Count -gt 0) { throw "Clean repo proof requires clean starting status: $($Before -join '; ')" }
$Pointers = @("CURRENT_PHASE_CLOSED_CLEANLY.md", "CURRENT_PHASE_FINAL_HANDOFF.md")
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ProofArchive = Join-Path $AutoOpsRoot "00_control_center\archive\phase200_pointer_cleanup_proof_$Stamp"
New-Item -ItemType Directory -Force $ProofArchive | Out-Null
try {
  foreach ($Pointer in $Pointers) {
    $Abs = Join-Path $RepoRoot $Pointer
    Set-Content -LiteralPath $Abs -Value "simulated Phase200 pointer dirtiness for $Pointer" -Encoding UTF8
  }
  $Dirty = Get-RepoStatus
  foreach ($Pointer in $Pointers) {
    $Matched = $Dirty | Where-Object { $_ -match [regex]::Escape($Pointer) -and ($_ -match '^\s*M\s+' -or $_ -match '^\?\?\s+') }
    if (!$Matched) { throw "Pointer proof did not create expected pointer-file dirtiness for $Pointer. Status: $($Dirty -join '; ')" }
  }
  Push-Location $RepoRoot
  try { git diff -- CURRENT_PHASE_CLOSED_CLEANLY.md CURRENT_PHASE_FINAL_HANDOFF.md | Set-Content -LiteralPath (Join-Path $ProofArchive "current_phase_pointer_diff.patch") -Encoding UTF8 }
  finally { Pop-Location }
  foreach ($Pointer in $Pointers) {
    Copy-Item -LiteralPath (Join-Path $RepoRoot $Pointer) -Destination (Join-Path $ProofArchive $Pointer) -Force
  }
} finally {
  foreach ($Pointer in $Pointers) { Restore-Pointer $Pointer }
}
$After = Get-RepoStatus
if ($After.Count -gt 0) { throw "Pointer cleanup did not restore clean git status: $($After -join '; ')" }
foreach ($Required in @("current_phase_pointer_diff.patch","CURRENT_PHASE_CLOSED_CLEANLY.md","CURRENT_PHASE_FINAL_HANDOFF.md")) {
  if (!(Test-Path -LiteralPath (Join-Path $ProofArchive $Required))) { throw "Missing archived pointer proof artifact: $Required" }
}
Write-Host "PHASE200_POINTER_CLEAN_REPO_PROOF_PASS archive=$ProofArchive"
exit 0
