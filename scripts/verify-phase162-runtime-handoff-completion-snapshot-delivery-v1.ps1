$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$PhaseScript = Join-Path $Root "scripts\phase162-runtime-handoff-completion-snapshot-delivery-v1.ps1"
$Overlay = Join-Path $Root ".overlay\phase162_runtime_handoff_completion_snapshot_delivery_v1.json"
$Proof = Join-Path $Root ".sera-proof\phase162_runtime_handoff_completion_snapshot_delivery_v1.json"
$Doc = Join-Path $Root "docs\phase162-runtime-handoff-completion-snapshot-delivery-v1.md"

$Checks = New-Object System.Collections.Generic.List[string]

foreach ($Path in @($PhaseScript,$Overlay,$Proof,$Doc)) {
  if (!(Test-Path $Path)) { throw "Missing required file: $Path" }
}
$Checks.Add("required files exist")

$OverlayJson = Get-Content $Overlay -Raw | ConvertFrom-Json
if ($OverlayJson.phase -ne 162) { throw "Overlay phase mismatch" }
if ($OverlayJson.expectedZipFilename -ne "s.e.r.a_phase162_runtime_handoff_completion_snapshot_delivery_v1_overlay.zip") { throw "Overlay expected ZIP mismatch" }
$Checks.Add("overlay metadata valid")

$ProofJson = Get-Content $Proof -Raw | ConvertFrom-Json
if ($ProofJson.phase -ne 162) { throw "Proof phase mismatch" }
if (!$ProofJson.proofOfUse.simulatedFullLoopSelfTest) { throw "Proof must declare simulated full-loop self-test" }
$Checks.Add("proof metadata valid")

$SelfTestOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $PhaseScript -Mode SelfTest -NoClipboard 2>&1
$SelfTestExit = $LASTEXITCODE
$SelfTestText = ($SelfTestOutput | Out-String)
if ($SelfTestExit -ne 0) { throw "SelfTest failed: $SelfTestText" }
$SelfTestJson = $SelfTestText | ConvertFrom-Json
if ($SelfTestJson.status -ne "PASS") { throw "SelfTest did not return PASS" }
$Checks.Add("simulated full-loop self-test passed")

$Temp = Join-Path $env:TEMP ("sera-phase162-verifier-" + [guid]::NewGuid().ToString("N"))
$Control = Join-Path $Temp "00_control_center"
$Handoff = Join-Path $Temp "06_handoff"
$Run = Join-Path $Control "single_flow_runs\blocked-child"
$Snaps = Join-Path $Run "snapshots"
New-Item -ItemType Directory -Force $Control,$Handoff,$Run,$Snaps | Out-Null
"{""snapshot"":""blocked""}" | Set-Content (Join-Path $Snaps "blocked.json") -Encoding UTF8

$BlockedOut = Join-Path $Temp "blocked-out.txt"
$BlockedErr = Join-Path $Temp "blocked-err.txt"
$BlockedProc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile","-ExecutionPolicy","Bypass","-File",$PhaseScript,
  "-Mode","Finalize",
  "-Status","BLOCKED",
  "-PhaseName","s.e.r.a_phase162_runtime_handoff_completion_snapshot_delivery_v1_overlay",
  "-PhaseNumber","162",
  "-Stage","verifier_blocked_exit",
  "-Message","Verifier blocked immediate-stop proof.",
  "-RunDir",$Run,
  "-SnapshotBundlePath",$Snaps,
  "-HandoffDir",$Handoff,
  "-ControlDir",$Control,
  "-NoClipboard"
) -RedirectStandardOutput $BlockedOut -RedirectStandardError $BlockedErr -WindowStyle Hidden -PassThru
$BlockedProc.WaitForExit()
if ($BlockedProc.ExitCode -eq 0) { throw "BLOCKED finalization must exit nonzero" }
if (!(Test-Path (Join-Path $Control "CURRENT_CHATGPT_HANDOFF.md"))) { throw "BLOCKED finalization did not write CURRENT_CHATGPT_HANDOFF.md" }
$Checks.Add("BLOCKED finalization exits nonzero and writes current handoff")

$InvalidOut = Join-Path $Temp "invalid-out.txt"
$InvalidErr = Join-Path $Temp "invalid-err.txt"
$InvalidProc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
  "-NoProfile","-ExecutionPolicy","Bypass","-File",$PhaseScript,
  "-Mode","ResolveStatus",
  "-Status","NOT_A_STATUS",
  "-NoClipboard"
) -RedirectStandardOutput $InvalidOut -RedirectStandardError $InvalidErr -WindowStyle Hidden -PassThru
$InvalidProc.WaitForExit()
if ($InvalidProc.ExitCode -eq 0) { throw "Invalid status sample should fail" }
$Checks.Add("fail sample case rejects invalid terminal status")

$GoodStatusText = & powershell -NoProfile -ExecutionPolicy Bypass -File $PhaseScript -Mode ResolveStatus -Status PASS_GUARANTEED -NoClipboard 2>&1 | Out-String
$GoodStatusJson = $GoodStatusText | ConvertFrom-Json
if ($GoodStatusJson.status -ne "PASS_GUARANTEED") { throw "PASS_GUARANTEED resolver failed" }
$Checks.Add("pass sample case resolves PASS_GUARANTEED")

[pscustomobject]@{
  phase = 162
  status = "PASS"
  verifier = "phase162-runtime-handoff-completion-snapshot-delivery-v1"
  checks = $Checks
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 20
exit 0
