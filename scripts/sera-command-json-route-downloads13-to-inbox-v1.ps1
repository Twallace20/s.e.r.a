param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [switch]$Once
)

$ErrorActionPreference = "Stop"

$Downloads13 = Join-Path $AutoOpsRoot "13_chatgpt_downloads"
$Inbox = Join-Path $AutoOpsRoot "00_control_center\command_inbox"
$StateDir = Join-Path $AutoOpsRoot "00_control_center\state"
$ArchiveDir = Join-Path $AutoOpsRoot "00_control_center\archive\routed_command_json"
$LogDir = Join-Path $AutoOpsRoot "00_control_center\logs"

New-Item -ItemType Directory -Force $Downloads13 | Out-Null
New-Item -ItemType Directory -Force $Inbox | Out-Null
New-Item -ItemType Directory -Force $StateDir | Out-Null
New-Item -ItemType Directory -Force $ArchiveDir | Out-Null
New-Item -ItemType Directory -Force $LogDir | Out-Null

$StatePath = Join-Path $StateDir "command-json-downloads13-router-state.json"

function Write-Step {
  param([string]$Message)
  Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
}

function Get-FileSha256 {
  param([string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Read-RouteState {
  if (!(Test-Path $StatePath)) {
    return @{}
  }

  try {
    $Raw = Get-Content -LiteralPath $StatePath -Raw
    if ([string]::IsNullOrWhiteSpace($Raw)) { return @{} }
    $Obj = $Raw | ConvertFrom-Json
    $Map = @{}
    foreach ($Prop in $Obj.PSObject.Properties) {
      $Map[$Prop.Name] = [string]$Prop.Value
    }
    return $Map
  } catch {
    return @{}
  }
}

function Write-RouteState {
  param([hashtable]$State)

  $Out = [ordered]@{}
  foreach ($Key in ($State.Keys | Sort-Object)) {
    $Out[$Key] = $State[$Key]
  }

  ($Out | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $StatePath -Encoding UTF8
}

function Test-SafeCommandJson {
  param(
    [string]$Path,
    [ref]$Reason
  )

  $Name = Split-Path $Path -Leaf

  if ($Name -notlike "autopilot-command-*.json") {
    $Reason.Value = "filename_not_allowed"
    return $false
  }

  if ($Name -like "*package-lock*" -or $Name -eq "package.json") {
    $Reason.Value = "package_json_rejected"
    return $false
  }

  try {
    $Raw = Get-Content -LiteralPath $Path -Raw
    $Json = $Raw | ConvertFrom-Json
  } catch {
    $Reason.Value = "invalid_json"
    return $false
  }

  $HasCommandShape = $false

  if ($Json.phaseSlug -and $Json.expectedZipFilename) {
    $HasCommandShape = $true
  }

  if ($Json.commandId -and $Json.runNonce) {
    $HasCommandShape = $true
  }

  if (!$HasCommandShape) {
    $Reason.Value = "missing_command_shape"
    return $false
  }

  if ($Json.expectedZipFilename -and ([string]$Json.expectedZipFilename -notlike "s.e.r.a_*_overlay.zip")) {
    $Reason.Value = "unexpected_zip_filename_shape"
    return $false
  }

  $Reason.Value = "accepted"
  return $true
}

function Invoke-CommandJsonRoutingOnce {
  $State = Read-RouteState
  $RoutedCount = 0

  $Candidates = Get-ChildItem $Downloads13 -File -Filter "*.json" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime

  foreach ($Candidate in $Candidates) {
    $Reason = ""
    $ReasonRef = [ref]$Reason

    if (!(Test-SafeCommandJson -Path $Candidate.FullName -Reason $ReasonRef)) {
      Write-Step "COMMAND_JSON_ROUTE_REJECTED_NOT_COMMAND file=$($Candidate.FullName) reason=$($ReasonRef.Value)"
      continue
    }

    $Hash = Get-FileSha256 -Path $Candidate.FullName
    $StateKey = $Candidate.FullName.ToLowerInvariant()

    if ($State.ContainsKey($StateKey) -and $State[$StateKey] -eq $Hash) {
      Write-Step "COMMAND_JSON_ROUTE_SKIPPED_DUPLICATE file=$($Candidate.FullName) hash=$Hash"
      continue
    }

    $Dest = Join-Path $Inbox $Candidate.Name
    $ShouldCopy = $true

    if (Test-Path $Dest) {
      $DestHash = Get-FileSha256 -Path $Dest
      if ($DestHash -eq $Hash) {
        $ShouldCopy = $false
      }
    }

    if ($ShouldCopy) {
      Copy-Item -LiteralPath $Candidate.FullName -Destination $Dest -Force
      (Get-Item -LiteralPath $Dest).LastWriteTime = Get-Date
      Write-Step "ROUTED_COMMAND_JSON_TO_INBOX source=$($Candidate.FullName) dest=$Dest hash=$Hash"
    } else {
      Write-Step "COMMAND_JSON_ROUTE_SKIPPED_DUPLICATE file=$($Candidate.FullName) dest=$Dest hash=$Hash"
    }

    $State[$StateKey] = $Hash
    $RoutedCount += 1
    Write-Step "COMMAND_JSON_ROUTED_FROM_DOWNLOADS13 file=$($Candidate.FullName) dest=$Dest"
  }

  Write-RouteState -State $State
  return $RoutedCount
}

$Count = Invoke-CommandJsonRoutingOnce
Write-Step "COMMAND_JSON_ROUTE_SCAN_COMPLETE routed=$Count"

if (!$Once) {
  Write-Step "COMMAND_JSON_ROUTE_ONCE_COMPLETE"
}

exit 0
