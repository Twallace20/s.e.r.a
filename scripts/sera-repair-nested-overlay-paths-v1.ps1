param(
  [string]$RepoRoot = "C:\Users\18123\Documents\SERA-Core\s.e.r.a",
  [switch]$CommitIfChanged,
  [string]$CommitMessage = "fix: flatten nested overlay paths"
)

$ErrorActionPreference = "Stop"

Set-Location $RepoRoot

function Move-NestedContents {
  param(
    [string]$ParentRelative,
    [string]$NestedName
  )

  $Parent = Join-Path $RepoRoot $ParentRelative
  $Nested = Join-Path $Parent $NestedName

  if (!(Test-Path $Nested)) {
    return $false
  }

  New-Item -ItemType Directory -Force $Parent | Out-Null

  Get-ChildItem -LiteralPath $Nested -Force | ForEach-Object {
    $Destination = Join-Path $Parent $_.Name
    if (Test-Path $Destination) {
      Remove-Item -LiteralPath $Destination -Recurse -Force
    }
    Move-Item -LiteralPath $_.FullName -Destination $Destination -Force
    Write-Host "FLATTENED $ParentRelative\$NestedName\$($_.Name) -> $ParentRelative\$($_.Name)"
  }

  Remove-Item -LiteralPath $Nested -Recurse -Force
  Write-Host "REMOVED_NESTED_PATH $ParentRelative\$NestedName"
  return $true
}

$Changed = $false
if (Move-NestedContents -ParentRelative ".overlay" -NestedName ".overlay") { $Changed = $true }
if (Move-NestedContents -ParentRelative ".sera-proof" -NestedName ".sera-proof") { $Changed = $true }
if (Move-NestedContents -ParentRelative "docs" -NestedName "docs") { $Changed = $true }
if (Move-NestedContents -ParentRelative "scripts" -NestedName "scripts") { $Changed = $true }

foreach ($Forbidden in @(".overlay\.overlay",".sera-proof\.sera-proof","docs\docs","scripts\scripts")) {
  $Path = Join-Path $RepoRoot $Forbidden
  if (Test-Path $Path) {
    throw "Nested path still exists after flatten repair: $Forbidden"
  }
}

if ($CommitIfChanged) {
  $Status = & git status --porcelain
  if ($Status) {
    & git add --all
    if ($LASTEXITCODE -ne 0) { throw "git add failed during flatten repair" }

    & git commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) { throw "git commit failed during flatten repair" }

    Write-Host "FLATTEN_REPAIR_COMMITTED"
  } else {
    Write-Host "FLATTEN_REPAIR_NO_COMMIT_NEEDED"
  }
}

Write-Host "FLATTEN_REPAIR_PASS"
