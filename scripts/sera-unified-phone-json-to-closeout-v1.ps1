param([ValidateSet("RunOnce","SelfTest")][string]$Mode="RunOnce",[string]$RepoRoot=(Get-Location).Path,[string]$AutoOpsRoot="$env:USERPROFILE\OneDrive\SERA-AutoOps",[int]$WaitForZipSeconds=0,[switch]$NoApply)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path $MyInvocation.MyCommand.Path -Parent
. (Join-Path $ScriptRoot "sera-native-command-helpers-v1.ps1")
. (Join-Path $ScriptRoot "sera-powershell-argument-builder-v1.ps1")

$Control=Join-Path $AutoOpsRoot "00_control_center"; $CommandInbox=Join-Path $Control "command_inbox"; $ArchiveRoot=Join-Path $Control "archive"; $BridgeOutbox=Join-Path $AutoOpsRoot "15_bridge_outbox"; $Handoff=Join-Path $AutoOpsRoot "06_handoff"; $Downloads13=Join-Path $AutoOpsRoot "13_chatgpt_downloads"; $ApplyApproved=Join-Path $AutoOpsRoot "01_apply_approved"; $LogPath=Join-Path $Control "production_watchers\sera-unified-phone-json-to-closeout-v1.log"
New-Item -ItemType Directory -Force $Control,$CommandInbox,$ArchiveRoot,$BridgeOutbox,$Handoff,$Downloads13,$ApplyApproved,(Split-Path $LogPath -Parent) | Out-Null

function Get-LatestClosedPhase {
  $Latest = Get-ChildItem $Handoff -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "phase(\d+)" -and (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) -like "*Status: CLOSED_CLEANLY*" } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if(!$Latest){return 0}; if($Latest.Name -match "phase(\d+)"){return [int]$Matches[1]}; return 0
}

function Get-SeraJsonPropertyValue {
  param([object]$Json,[string]$Name)
  if($null -eq $Json){ return $null }
  $Prop = $Json.PSObject.Properties[$Name]
  if(!$Prop){ return $null }
  return $Prop.Value
}

function Get-SeraJsonString {
  param([object]$Json,[string]$Name,[string]$Default = "")
  $Value = Get-SeraJsonPropertyValue -Json $Json -Name $Name
  if($null -eq $Value){ return $Default }
  return [string]$Value
}

function Read-SeraCommandJson { param([string]$Path)
  try {
    $Raw = Get-Content -LiteralPath $Path -Raw
    $Json = $Raw | ConvertFrom-Json
  } catch {
    Write-SeraLog -Message "SKIPPED_MALFORMED :: $Path" -LogPath $LogPath
    return $null
  }

  $PhaseValue = Get-SeraJsonPropertyValue -Json $Json -Name "phase"
  if($null -eq $PhaseValue){ $PhaseValue = Get-SeraJsonPropertyValue -Json $Json -Name "phaseStart" }

  $Phase = $null
  if($null -ne $PhaseValue){ $Phase = [int]$PhaseValue }

  $Slug = Get-SeraJsonString -Json $Json -Name "phaseSlug"
  $Zip = Get-SeraJsonString -Json $Json -Name "expectedZipFilename"
  if([string]::IsNullOrWhiteSpace($Zip)){ $Zip = Get-SeraJsonString -Json $Json -Name "expectedZipName" }

  if(!$Phase -or [string]::IsNullOrWhiteSpace($Slug) -or [string]::IsNullOrWhiteSpace($Zip)){
    Write-SeraLog -Message "SKIPPED_MALFORMED :: missing required fields :: $Path" -LogPath $LogPath
    return $null
  }

  [pscustomobject]@{path=$Path; raw=$Raw; json=$Json; phase=$Phase; phaseSlug=$Slug; expectedZipFilename=$Zip; commandId=(Get-SeraJsonString -Json $Json -Name "commandId"); runNonce=(Get-SeraJsonString -Json $Json -Name "runNonce"); ownerGuidance=(Get-SeraJsonString -Json $Json -Name "ownerGuidance")}
}

function Invoke-SeraCommandInboxHygiene { param([int]$LatestClosedPhase)
  $Archive=Join-Path $ArchiveRoot ("command_inbox_unified_"+(Get-Date -Format "yyyyMMdd_HHmmss")); New-Item -ItemType Directory -Force $Archive | Out-Null
  foreach($File in Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue){ $Command=Read-SeraCommandJson -Path $File.FullName; if(!$Command){Move-Item $File.FullName (Join-Path $Archive $File.Name) -Force; Write-SeraLog -Message "SKIPPED_MALFORMED_ARCHIVED :: $($File.FullName)" -LogPath $LogPath; continue}; if($Command.phase -le $LatestClosedPhase -or $File.Name -like "*phase999_selftest*"){Move-Item $File.FullName (Join-Path $Archive $File.Name) -Force; Write-SeraLog -Message "SKIPPED_STALE :: archived $($File.FullName)" -LogPath $LogPath; continue} }
}

function New-SeraRichPrompt { param($Command)
  $Lines=New-Object System.Collections.Generic.List[string]
  @("S.E.R.A. PHASE REQUEST","","Return the downloadable overlay ZIP for:","","Phase $($Command.phase) - $($Command.phaseSlug)","","Expected ZIP filename:",$Command.expectedZipFilename,"","Purpose:") | ForEach-Object {$Lines.Add($_)}
  $PurposeText = Get-SeraJsonString -Json $Command.json -Name "purpose"
  if(-not [string]::IsNullOrWhiteSpace($PurposeText)){$Lines.Add($PurposeText)}elseif(-not [string]::IsNullOrWhiteSpace($Command.ownerGuidance)){$Lines.Add($Command.ownerGuidance)}else{$Lines.Add("Continue S.E.R.A. development from the selected command inbox JSON.")}
  if(-not [string]::IsNullOrWhiteSpace($Command.ownerGuidance)){$Lines.Add("");$Lines.Add("Owner guidance:");$Lines.Add($Command.ownerGuidance)}
  $Lines.Add("");$Lines.Add("Command contract:");$Lines.Add("- commandId: $($Command.commandId)");$Lines.Add("- runNonce: $($Command.runNonce)");$Lines.Add("- phaseSlug: $($Command.phaseSlug)");$Lines.Add("- expectedZipFilename: $($Command.expectedZipFilename)");$Lines.Add("- savedChatGptTargetOnly: true");$Lines.Add("- allowRandomRecentChatFallback: false");$Lines.Add("- allowNewChatFallback: false");$Lines.Add("");$Lines.Add("Requirements:");$Lines.Add("- Return a downloadable ZIP link.");$Lines.Add("- Return SHA256.");$Lines.Add("- ZIP root must be repo/.");$Lines.Add("- Include .overlay manifest.");$Lines.Add("- Include .sera-proof verification file."); return ($Lines -join "`r`n")
}

function Write-SeraRequestReady { param($Command)
  $PromptPath=Join-Path $BridgeOutbox ("phase{0}-{1}-{2}.md" -f $Command.phase,$Command.phaseSlug,$Command.runNonce); $PromptText=New-SeraRichPrompt -Command $Command; $PromptText | Set-Content $PromptPath -Encoding UTF8
  $Request=[ordered]@{ok=$true; status="REQUEST_READY"; phase="$($Command.phase)"; phaseSlug=$Command.phaseSlug; expectedZipName=$Command.expectedZipFilename; commandJson=$Command.path; promptFile=$PromptPath; zipAuthoritativePath=(Join-Path $Downloads13 $Command.expectedZipFilename); createdAtUtc=(Get-Date).ToUniversalTime().ToString("o")}
  $Request | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $Control "artifact-watch-request.json") -Encoding UTF8; $Request | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $Control "artifact-generation-lease.json") -Encoding UTF8; $PromptText | Set-Content (Join-Path $Control "CURRENT_CHATGPT_HANDOFF.prompt.md") -Encoding UTF8
  Write-SeraLog -Message "REQUEST_READY :: phase=$($Command.phase) slug=$($Command.phaseSlug) prompt=$PromptPath" -LogPath $LogPath; return $PromptPath
}

function Wait-SeraExactZip { param($Command,[int]$Seconds)
  $ZipPath=Join-Path $Downloads13 $Command.expectedZipFilename; if(Test-Path -LiteralPath $ZipPath){Write-SeraLog -Message "ZIP_FOUND :: $ZipPath" -LogPath $LogPath; return $ZipPath}
  $WaitingPath=Join-Path $Handoff ("s.e.r.a_{0}_overlay-{1}-WAITING_FOR_ZIP.md" -f $Command.phaseSlug,(Get-Date -Format "yyyyMMdd_HHmmss")); @("# S.E.R.A. AutoOps Packet","","Status: WAITING_FOR_ZIP","Phase: s.e.r.a_$($Command.phaseSlug)_overlay","Branch: main","","## Summary","Bridge did not download the artifact. The unified watcher is waiting for the exact ZIP in 13_chatgpt_downloads.","","## Evidence",$ZipPath) -join "`r`n" | Set-Content $WaitingPath -Encoding UTF8
  Write-SeraLog -Message "WAITING_FOR_ZIP :: $ZipPath" -LogPath $LogPath; if($Seconds -le 0){return $null}; $Deadline=(Get-Date).AddSeconds($Seconds); while((Get-Date)-lt $Deadline){ if(Test-Path -LiteralPath $ZipPath){Write-SeraLog -Message "ZIP_FOUND :: $ZipPath" -LogPath $LogPath; return $ZipPath}; Start-Sleep -Seconds 2}; return $null
}

function Test-SeraBranchIntegrity { param([string]$RepoRoot,[string]$Branch,[string[]]$RequiredPaths)
  $Current=(Get-SeraNativeOutput -Command "git branch --show-current" -WorkingDirectory $RepoRoot -LogPath $LogPath | Select-Object -First 1).Trim(); if($Current -ne $Branch){throw "Branch integrity failed: expected $Branch but current branch is $Current"}; foreach($Path in $RequiredPaths){if(!(Test-Path (Join-Path $RepoRoot $Path))){throw "Branch integrity failed: missing required path on work branch: $Path"}}; return $true
}

if($Mode -eq "SelfTest"){
  Write-SeraLog -Message "SELFTEST_START :: unified phone loop" -LogPath $LogPath; Test-SeraNativeHelpers -LogPath $LogPath | Out-Null; Test-SeraArgumentBuilder | Out-Null
  $TestFile=Join-Path $CommandInbox "autopilot-command-phase999_selftest.json"; [ordered]@{phase=999;phaseSlug="phase999_selftest";commandId="phase999-selftest";runNonce="selftest";expectedZipFilename="s.e.r.a_phase999_selftest_overlay.zip";ownerGuidance="Self-test command. Should be archived after verification."} | ConvertTo-Json -Depth 10 | Set-Content $TestFile -Encoding UTF8
  $Command=Read-SeraCommandJson -Path $TestFile; if(!$Command){throw "Self-test command parse failed."}; $Prompt=Write-SeraRequestReady -Command $Command; if(!(Test-Path $Prompt)){throw "Self-test prompt missing."}; Invoke-SeraCommandInboxHygiene -LatestClosedPhase 998; if(Test-Path $TestFile){throw "Self-test cleanup failed: phase999_selftest command remains in command_inbox."}; Write-SeraLog -Message "SELFTEST_PASS :: unified phone loop" -LogPath $LogPath; exit 0
}

$LatestClosed=Get-LatestClosedPhase; Write-SeraLog -Message "IDLE_CHECK :: latestClosed=$LatestClosed" -LogPath $LogPath; Invoke-SeraCommandInboxHygiene -LatestClosedPhase $LatestClosed
$Commands=Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue | ForEach-Object {Read-SeraCommandJson -Path $_.FullName} | Where-Object {$_ -and $_.phase -gt $LatestClosed} | Sort-Object phase
if(!$Commands){Write-SeraLog -Message "IDLE :: no runnable command JSON above latest closed phase $LatestClosed" -LogPath $LogPath; exit 0}
$Selected=$Commands | Select-Object -First 1; $PromptPath=Write-SeraRequestReady -Command $Selected; $ZipPath=Wait-SeraExactZip -Command $Selected -Seconds $WaitForZipSeconds; if(!$ZipPath -or $NoApply){exit 0}; Write-SeraLog -Message "ZIP_READY_FOR_APPLY :: $ZipPath" -LogPath $LogPath; exit 0
