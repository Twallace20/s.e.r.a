[CmdletBinding()]
param()
Write-Output "PHASE201_CHILD_STDOUT_SUCCESS"
[Console]::Error.WriteLine("PHASE201_CHILD_STDERR_SUCCESS_SHOULD_NOT_BLOCK")
exit 0
