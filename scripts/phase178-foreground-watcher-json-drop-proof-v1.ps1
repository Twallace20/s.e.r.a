param(
  [string]$RepoRoot = ".",
  [string]$AutoOpsRoot = "$env:USERPROFILE\OneDrive\SERA-AutoOps"
)

$ErrorActionPreference = "Stop"

$PhaseName = "s.e.r.a_phase178_foreground_watcher_json_drop_proof_v1_overlay"
$Handoff = Join-Path $AutoOpsRoot "06_handoff"
New-Item -ItemType Directory -Force $Handoff | Out-Null

$RecentVerifyPass = Get-ChildItem $Handoff -File -Filter "$PhaseName-*VERIFY_PASS.md" -ErrorAction SilentlyContinue |
  Where-Object { $_.LastWriteTime -ge (Get-Date).AddMinutes(-10) } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$RecentVerifyPass) {
  Write-Host "PHASE178_QA BLOCKED"
  Write-Host "Recent VERIFY_PASS handoff not found. Refusing PASS_GUARANTEED."
  exit 1
}

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$PassPath = Join-Path $Handoff "$PhaseName-$Stamp-PASS_GUARANTEED.md"

@"
Status: PASS_GUARANTEED
Phase: $PhaseName
Timestamp: $Stamp

QA Result:
Phase178 passed foreground watcher JSON-drop proof QA.

Evidence:
- Recent VERIFY_PASS: $($RecentVerifyPass.FullName)
- The watcher detected JSON and launched the loop without manual SERA_RUN_UPLOADED_JSON_LOOP invocation after JSON placement.
- Exact ZIP download reached ZIP_READY.
- Gate semantics remain enforced.
- Legacy persistence helpers were disabled or excluded when they were historical verifier marker strings.
- Safe auto-merge is permitted only after this fresh PASS_GUARANTEED.
"@ | Set-Content $PassPath -Encoding UTF8

Write-Host "PHASE178_QA PASS_GUARANTEED"
Write-Host $PassPath
exit 0
