[CmdletBinding()]
param([string]$RepoRoot = (Get-Location).Path,[switch]$Repair)
$ErrorActionPreference = "Stop"
Set-Location $RepoRoot
$PointerFiles = @('CURRENT_PHASE_CLOSED_CLEANLY.md','CURRENT_PHASE_FINAL_HANDOFF.md')
$DirtyBefore = @(git status --short -- $PointerFiles)
if ($Repair -and $DirtyBefore.Count -gt 0) { git checkout -- $PointerFiles | Out-Null }
$DirtyAfter = @(git status --short -- $PointerFiles)
$Status = if ($DirtyAfter.Count -eq 0) { 'CLEAN' } else { 'DIRTY' }
[pscustomobject]@{ status=$Status; dirtyBefore=$DirtyBefore; dirtyAfter=$DirtyAfter; marker='PHASE198_POINTER_DIFF_CLEANUP_VERIFIED' } | ConvertTo-Json -Compress
if ($Status -ne 'CLEAN') { exit 1 }
