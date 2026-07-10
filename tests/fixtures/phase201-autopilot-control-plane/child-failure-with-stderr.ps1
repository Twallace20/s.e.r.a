[CmdletBinding()]
param()
Write-Output "PHASE201_CHILD_STDOUT_FAILURE_CAPTURE"
[Console]::Error.WriteLine("PHASE201_CHILD_STDERR_FAILURE_CAPTURE")
exit 7
