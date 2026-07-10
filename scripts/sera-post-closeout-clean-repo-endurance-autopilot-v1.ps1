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
  [string]$Reason = ""
)
$ErrorActionPreference = "Stop"

$Missing = @()
if (!$VerifierPassed) { $Missing += "verifier" }
if (!$QaPassed) { $Missing += "qa" }
if (!$MergePassed) { $Missing += "merge" }
if (!$PushMainPassed) { $Missing += "push_main" }
if (!$PushTagPassed) { $Missing += "push_tag" }
if (!$RemoteMainVerified) { $Missing += "remote_main" }
if (!$RemoteTagVerified) { $Missing += "remote_tag" }
if (!$FinalHandoffIdentityVerified) { $Missing += "final_handoff_identity" }
if (!$ExactZipShaVerified) { $Missing += "exact_zip_sha" }
if (!$PostCloseoutGitStatusClean) { $Missing += "post_closeout_git_status_clean" }

if ($Missing.Count -gt 0) {
  $Payload = [ordered]@{
    status = "BLOCKED"
    reason = if ($Reason) { $Reason } else { "Missing required Phase199 clean-repo endurance gates: $($Missing -join ', ')" }
    missing = $Missing
    phase = 199
    phaseSlug = "phase199_post_closeout_clean_repo_endurance_autopilot_v1"
  }
  Write-Output ($Payload | ConvertTo-Json -Compress)
  exit 0
}

$Payload = [ordered]@{
  status = "CLOSED_CLEANLY"
  reason = "All Phase199 autopilot, remote-truth, exact ZIP SHA, final handoff identity, and post-closeout clean-repo gates passed."
  missing = @()
  phase = 199
  phaseSlug = "phase199_post_closeout_clean_repo_endurance_autopilot_v1"
}
Write-Output ($Payload | ConvertTo-Json -Compress)
exit 0
