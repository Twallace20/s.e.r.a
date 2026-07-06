param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a"
)

$ErrorActionPreference = "Stop"

function Repair-NestedOverlayPaths {
  param([string]$Root)

  $Pairs = @(
    @{ Nested = ".overlay\.overlay"; Target = ".overlay" },
    @{ Nested = ".sera-proof\.sera-proof"; Target = ".sera-proof" },
    @{ Nested = "docs\docs"; Target = "docs" },
    @{ Nested = "scripts\scripts"; Target = "scripts" }
  )

  $Changed = $false

  foreach ($Pair in $Pairs) {
    $NestedPath = Join-Path $Root $Pair.Nested
    $TargetPath = Join-Path $Root $Pair.Target

    if (!(Test-Path $NestedPath)) { continue }

    New-Item -ItemType Directory -Force $TargetPath | Out-Null

    Get-ChildItem -LiteralPath $NestedPath -Force | ForEach-Object {
      $Destination = Join-Path $TargetPath $_.Name
      if (Test-Path $Destination) { Remove-Item $Destination -Recurse -Force }
      Move-Item -LiteralPath $_.FullName -Destination $Destination -Force
      Write-Host "FLATTENED $($Pair.Nested)\$($_.Name) -> $($Pair.Target)\$($_.Name)"
      $Changed = $true
    }

    Remove-Item $NestedPath -Recurse -Force
  }

  if ($Changed) { Write-Host "FLATTEN_REPAIR_PASS" } else { Write-Host "FLATTEN_REPAIR_NO_COMMIT_NEEDED" }
}

Repair-NestedOverlayPaths -Root $RepoRoot
