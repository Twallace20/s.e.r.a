param(
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps",
  [string]$ExpectedZipFilename = "s.e.r.a_phase139_phase_139_safe_autopilot_continuation_v1_overlay.zip",
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

function New-DirectoryIfMissing {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

$phase = "phase139"
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$archiveRoot = Join-Path $AutoOpsRoot "00_control_center\archive\phase139-blocked-hotfix-attempt1-$stamp"
$evidenceRoot = Join-Path $AutoOpsRoot "00_control_center\evidence\phase139-blocked-hotfix-attempt1"

$result = [ordered]@{
  ok = $true
  apply = [bool]$Apply
  phase = 139
  hotfixAttempt = 1
  expectedZipFilename = $ExpectedZipFilename
  autoOpsRoot = $AutoOpsRoot
  archiveRoot = $archiveRoot
  evidenceRoot = $evidenceRoot
  savedTargetOnly = $true
  allowRandomRecentChatFallback = $false
  allowNewChatFallback = $false
  moved = @()
  notes = @(
    "Smallest safe recovery helper only.",
    "No credentials, tokens, paid services, external accounts, GitHub settings, owner-control boundaries, self-merge, or production deployment changed.",
    "Use one canonical Phase 139 expected ZIP filename before retry."
  )
}

if ($Apply) {
  New-DirectoryIfMissing -Path $archiveRoot
  New-DirectoryIfMissing -Path $evidenceRoot

  $patterns = @(
    @{ Dir = "17_needs_attention"; Filter = "*phase139*" },
    @{ Dir = "15_bridge_outbox"; Filter = "*phase139*" },
    @{ Dir = "01_apply_approved"; Filter = "*phase139*" },
    @{ Dir = "02_hotfix_approved"; Filter = "*phase139*" },
    @{ Dir = "05_blocked"; Filter = "*phase139*" },
    @{ Dir = "08_processing"; Filter = "*phase139*" },
    @{ Dir = "00_control_center\command_inbox"; Filter = "*phase139*.json" }
  )

  foreach ($pattern in $patterns) {
    $dirPath = Join-Path $AutoOpsRoot $pattern.Dir
    if (Test-Path -LiteralPath $dirPath) {
      $files = Get-ChildItem -LiteralPath $dirPath -File -Filter $pattern.Filter -ErrorAction SilentlyContinue
      foreach ($file in $files) {
        $destDir = Join-Path $archiveRoot ($pattern.Dir -replace "[\\/]", "_")
        New-DirectoryIfMissing -Path $destDir
        $dest = Join-Path $destDir $file.Name
        Move-Item -LiteralPath $file.FullName -Destination $dest -Force
        $result.moved += [ordered]@{
          from = $file.FullName
          to = $dest
        }
      }
    }
  }

  $evidencePath = Join-Path $evidenceRoot ("phase139-blocked-hotfix-attempt1-applied-{0}.json" -f (Get-Date -Format "yyyyMMdd_HHmmss"))
  ($result | ConvertTo-Json -Depth 8) | Set-Content -Path $evidencePath -Encoding UTF8
  $result.evidencePath = $evidencePath
}

$result | ConvertTo-Json -Depth 8
