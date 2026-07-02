param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [int]$LatestClosedPhase = 0
)

$ErrorActionPreference = "Stop"

$Control = Join-Path $AutoOpsRoot "00_control_center"
$CommandInbox = Join-Path $Control "command_inbox"
$Archive = Join-Path $Control ("archive\command_inbox_hygiene_" + (Get-Date -Format "yyyyMMdd_HHmmss"))

New-Item -ItemType Directory -Force $CommandInbox,$Archive | Out-Null

$Archived = 0
$Kept = 0

foreach ($File in Get-ChildItem $CommandInbox -File -Filter "*.json" -ErrorAction SilentlyContinue) {
  $ArchiveReason = $null

  try {
    $Json = Get-Content $File.FullName -Raw | ConvertFrom-Json
    $Phase = if ($Json.phase) { [int]$Json.phase } elseif ($Json.phaseStart) { [int]$Json.phaseStart } else { $null }
    $Slug = [string]$Json.phaseSlug
    $Zip = if ($Json.expectedZipFilename) { [string]$Json.expectedZipFilename } elseif ($Json.expectedZipName) { [string]$Json.expectedZipName } else { "" }

    if (!$Phase -or !$Slug -or !$Zip) {
      $ArchiveReason = "malformed_or_missing_required_fields"
    } elseif ($Phase -le $LatestClosedPhase) {
      $ArchiveReason = "stale_or_already_closed"
    }
  } catch {
    $ArchiveReason = "invalid_json"
  }

  if ($ArchiveReason) {
    Move-Item $File.FullName (Join-Path $Archive $File.Name) -Force
    $Archived++
  } else {
    $Kept++
  }
}

[ordered]@{
  archived = $Archived
  kept = $Kept
  archivePath = $Archive
} | ConvertTo-Json -Depth 5
