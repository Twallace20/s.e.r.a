Set-StrictMode -Version Latest

function New-SeraArgumentList {
  param([Parameter(ValueFromRemainingArguments=$true)][object[]]$Items)
  $Clean = New-Object System.Collections.Generic.List[string]
  foreach ($Item in $Items) {
    if ($null -eq $Item) { continue }
    if ($Item -is [System.Array]) { foreach ($SubItem in $Item) { if ($null -eq $SubItem) { continue }; $Text=[string]$SubItem; if ([string]::IsNullOrWhiteSpace($Text)) { continue }; $Clean.Add($Text) }; continue }
    $Value=[string]$Item; if ([string]::IsNullOrWhiteSpace($Value)) { continue }; $Clean.Add($Value)
  }
  return [string[]]$Clean.ToArray()
}

function Invoke-SeraPowerShellFile {
  param([Parameter(Mandatory=$true)][string]$FilePath,[string[]]$ArgumentList=@(),[string]$WorkingDirectory=(Get-Location).Path,[string]$LogPath="",[string]$Label="PowerShell file")
  if (!(Test-Path -LiteralPath $FilePath)) { throw "PowerShell file missing: $FilePath" }
  $FinalArgs = New-SeraArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$FilePath) $ArgumentList
  if (!$FinalArgs -or $FinalArgs.Count -eq 0) { throw "Argument builder produced an empty argument list." }
  $OutFile = Join-Path ([IO.Path]::GetTempPath()) ("sera-ps-out-"+[guid]::NewGuid().ToString("N")+".log")
  $ErrFile = Join-Path ([IO.Path]::GetTempPath()) ("sera-ps-err-"+[guid]::NewGuid().ToString("N")+".log")
  try {
    $Proc = Start-Process -FilePath "powershell.exe" -ArgumentList $FinalArgs -WorkingDirectory $WorkingDirectory -Wait -PassThru -RedirectStandardOutput $OutFile -RedirectStandardError $ErrFile
    $Stdout = if (Test-Path $OutFile) { Get-Content $OutFile -Raw } else { "" }
    $Stderr = if (Test-Path $ErrFile) { Get-Content $ErrFile -Raw } else { "" }
    if($LogPath){ if($Stdout){Add-Content -Path $LogPath -Value $Stdout}; if($Stderr){Add-Content -Path $LogPath -Value $Stderr} }
    if($Stdout){Write-Host $Stdout}; if($Stderr){Write-Host $Stderr}
    if ($Proc.ExitCode -ne 0) { throw "$Label failed with exit $($Proc.ExitCode)" }
    [pscustomobject]@{ok=$true; exitCode=$Proc.ExitCode; stdout=$Stdout; stderr=$Stderr; args=$FinalArgs}
  } finally { Remove-Item $OutFile,$ErrFile -Force -ErrorAction SilentlyContinue }
}

function Test-SeraArgumentBuilder {
  $Built = New-SeraArgumentList @("a",$null,""," ","b",@("c",$null,""))
  if (($Built -join ",") -ne "a,b,c") { throw "Argument builder failed." }
  return $true
}
