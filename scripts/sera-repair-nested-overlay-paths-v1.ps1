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

  $Moved = 0

  foreach ($Pair in $Pairs) {
    $NestedPath = Join-Path $Root $Pair.Nested
    $TargetPath = Join-Path $Root $Pair.Target

    if (!(Test-Path $NestedPath)) {
      continue
    }

    New-Item -ItemType Directory -Force $TargetPath | Out-Null

    Get-ChildItem -LiteralPath $NestedPath -Force | ForEach-Object {
      $Destination = Join-Path $TargetPath $_.Name

      if (Test-Path $Destination) {
        Remove-Item $Destination -Recurse -Force
      }

      Move-Item -LiteralPath $_.FullName -Destination $Destination -Force
      $Moved++
      Write-Host "FLATTENED $($Pair.Nested)\$($_.Name) -> $($Pair.Target)\$($_.Name)"
    }

    Remove-Item $NestedPath -Recurse -Force
  }

  if ($Moved -eq 0) {
    Write-Host "FLATTEN_REPAIR_NO_COMMIT_NEEDED"
  }

  Write-Host "FLATTEN_REPAIR_PASS"
}

Repair-NestedOverlayPaths -Root $RepoRoot
