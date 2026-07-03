function Add-SeraArgumentItem {
  param(
    [object]$Item,
    [AllowEmptyCollection()]
    [System.Collections.Generic.List[string]]$Clean
  )

  if ($null -eq $Clean) {
    throw "Clean argument collection was not provided."
  }

  if ($null -eq $Item) { return }

  if (($Item -is [System.Array]) -and -not ($Item -is [string])) {
    foreach ($SubItem in $Item) {
      Add-SeraArgumentItem -Item $SubItem -Clean $Clean
    }
    return
  }

  $Text = [string]$Item
  if ([string]::IsNullOrWhiteSpace($Text)) { return }

  [void]$Clean.Add($Text)
}

function New-SeraArgumentList {
  param([object[]]$Items)

  $Clean = New-Object System.Collections.Generic.List[string]

  foreach ($Item in $Items) {
    Add-SeraArgumentItem -Item $Item -Clean $Clean
  }

  return [string[]]$Clean.ToArray()
}

function Invoke-SeraPowerShellFile {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [object[]]$ArgumentList = @(),
    [string]$WorkingDirectory = (Get-Location).Path,
    [string]$LogPath = "",
    [string]$Label = "PowerShell file"
  )

  if (!(Test-Path -LiteralPath $FilePath)) {
    throw "PowerShell file missing: $FilePath"
  }

  $FinalArgs = New-SeraArgumentList -Items @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $FilePath,
    $ArgumentList
  )

  if (!$FinalArgs -or $FinalArgs.Count -eq 0) {
    throw "Argument builder produced an empty argument list."
  }

  $OutFile = Join-Path ([IO.Path]::GetTempPath()) ("sera-ps-out-" + [guid]::NewGuid().ToString("N") + ".log")
  $ErrFile = Join-Path ([IO.Path]::GetTempPath()) ("sera-ps-err-" + [guid]::NewGuid().ToString("N") + ".log")

  try {
    $Proc = Start-Process -FilePath "powershell.exe" -ArgumentList $FinalArgs -WorkingDirectory $WorkingDirectory -Wait -PassThru -RedirectStandardOutput $OutFile -RedirectStandardError $ErrFile

    $Stdout = if (Test-Path $OutFile) { Get-Content $OutFile -Raw } else { "" }
    $Stderr = if (Test-Path $ErrFile) { Get-Content $ErrFile -Raw } else { "" }

    if ($LogPath) {
      if ($Stdout) { Add-Content -Path $LogPath -Value $Stdout }
      if ($Stderr) { Add-Content -Path $LogPath -Value $Stderr }
    }

    if ($Stdout) { Write-Host $Stdout }
    if ($Stderr) { Write-Host $Stderr }

    if ($Proc.ExitCode -ne 0) {
      throw "$Label failed with exit $($Proc.ExitCode)"
    }

    return [pscustomobject]@{
      ok = $true
      exitCode = $Proc.ExitCode
      stdout = $Stdout
      stderr = $Stderr
      args = $FinalArgs
    }
  }
  finally {
    Remove-Item $OutFile,$ErrFile -Force -ErrorAction SilentlyContinue
  }
}

function Test-SeraArgumentBuilder {
  $Built = New-SeraArgumentList -Items @(
    "a",
    $null,
    "",
    " ",
    "b",
    @("c",$null,""),
    @(@("d",""),@($null,"e"))
  )

  if (($Built -join ",") -ne "a,b,c,d,e") {
    throw "Argument builder failed. Built: $($Built -join ',')"
  }

  $Cmd = New-SeraArgumentList -Items @(
    "-NoProfile",
    @("-ExecutionPolicy","Bypass"),
    $null,
    "-File",
    "demo.ps1",
    @("-RepoRoot","C:\repo")
  )

  if (($Cmd -join "|") -ne "-NoProfile|-ExecutionPolicy|Bypass|-File|demo.ps1|-RepoRoot|C:\repo") {
    throw "Argument builder nested command failed. Built: $($Cmd -join '|')"
  }

  return $true
}
