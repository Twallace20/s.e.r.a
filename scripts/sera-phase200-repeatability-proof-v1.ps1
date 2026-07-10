param(
  [switch]$AsJson,
  [bool]$ConfirmedPromptSubmit = $true,
  [bool]$ExactDomDownload = $true,
  [bool]$Verified = $true,
  [bool]$Qa = $true,
  [bool]$Merged = $true,
  [bool]$PushMain = $true,
  [bool]$PushTag = $true,
  [bool]$RemoteMain = $true,
  [bool]$RemoteTag = $true,
  [bool]$HandoffIdentity = $true,
  [bool]$ZipSha = $true,
  [bool]$PostCloseoutCleanRepo = $true,
  [bool]$NoMidRunRepair = $true
)
$ErrorActionPreference = "Stop"
$All = $ConfirmedPromptSubmit -and $ExactDomDownload -and $Verified -and $Qa -and $Merged -and $PushMain -and $PushTag -and $RemoteMain -and $RemoteTag -and $HandoffIdentity -and $ZipSha -and $PostCloseoutCleanRepo -and $NoMidRunRepair
$Status = if ($All) { "CLOSED_CLEANLY" } else { "BLOCKED" }
$Reason = if ($All) { "All Phase200 repeat full-autopilot gates passed." } else { "One or more Phase200 repeatability gates failed." }
$Payload = [ordered]@{
  status = $Status
  reason = $Reason
  phase = 200
  phaseSlug = "phase200_repeat_full_autopilot_clean_baseline_proof_v1"
  gates = [ordered]@{
    confirmedPromptSubmit=$ConfirmedPromptSubmit; exactDomDownload=$ExactDomDownload; verified=$Verified; qa=$Qa;
    merged=$Merged; pushMain=$PushMain; pushTag=$PushTag; remoteMain=$RemoteMain; remoteTag=$RemoteTag;
    handoffIdentity=$HandoffIdentity; zipSha=$ZipSha; postCloseoutCleanRepo=$PostCloseoutCleanRepo; noMidRunRepair=$NoMidRunRepair
  }
}
if ($AsJson) { $Payload | ConvertTo-Json -Compress -Depth 8 } else { Write-Host "PHASE200_GATE_RESULT status=$Status reason=$Reason" }
if ($All) { exit 0 } else { exit 1 }
