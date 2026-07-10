[CmdletBinding()]
param(
  [switch]$VerifierPassed,
  [switch]$QaPassed,
  [switch]$MergePassed,
  [switch]$PushMainPassed,
  [switch]$PushTagPassed,
  [switch]$RemoteMainVerified,
  [switch]$RemoteTagVerified,
  [switch]$FinalHandoffIdentityVerified,
  [switch]$ExactZipShaVerified,
  [switch]$PostCloseoutGitStatusClean,
  [switch]$NoMidRunRepair
)
$Missing = @()
foreach ($Gate in @(
  @{Name='VerifierPassed'; Value=$VerifierPassed.IsPresent},
  @{Name='QaPassed'; Value=$QaPassed.IsPresent},
  @{Name='MergePassed'; Value=$MergePassed.IsPresent},
  @{Name='PushMainPassed'; Value=$PushMainPassed.IsPresent},
  @{Name='PushTagPassed'; Value=$PushTagPassed.IsPresent},
  @{Name='RemoteMainVerified'; Value=$RemoteMainVerified.IsPresent},
  @{Name='RemoteTagVerified'; Value=$RemoteTagVerified.IsPresent},
  @{Name='FinalHandoffIdentityVerified'; Value=$FinalHandoffIdentityVerified.IsPresent},
  @{Name='ExactZipShaVerified'; Value=$ExactZipShaVerified.IsPresent},
  @{Name='PostCloseoutGitStatusClean'; Value=$PostCloseoutGitStatusClean.IsPresent},
  @{Name='NoMidRunRepair'; Value=$NoMidRunRepair.IsPresent}
)) { if (-not $Gate.Value) { $Missing += $Gate.Name } }
$Status = if ($Missing.Count -eq 0) { 'CLOSED_CLEANLY' } else { 'BLOCKED' }
$Reason = if ($Missing.Count -eq 0) { 'All Phase200 full-autopilot repeatability, remote-truth, exact ZIP SHA, final handoff identity, no-mid-run-repair, and post-closeout clean-repo gates passed.' } else { 'Missing required Phase200 closeout gates: ' + ($Missing -join ', ') }
[ordered]@{ status=$Status; reason=$Reason; missing=$Missing; phase=200; phaseSlug='phase200_repeat_full_autopilot_clean_baseline_proof_v1' } | ConvertTo-Json -Compress
if ($Missing.Count -eq 0) { exit 0 } else { exit 1 }
