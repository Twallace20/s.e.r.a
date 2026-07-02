param([string]$RepoRoot=(Get-Location).Path,[string]$AutoOpsRoot="$env:USERPROFILE\OneDrive\SERA-AutoOps")
$ErrorActionPreference="Stop"
$Required=@("docs\phase166-unified-phone-json-to-closeout-hardening-v1.md","scripts\sera-native-command-helpers-v1.ps1","scripts\sera-powershell-argument-builder-v1.ps1","scripts\sera-unified-phone-json-to-closeout-v1.ps1","scripts\phase166-unified-phone-json-to-closeout-hardening-v1.ps1","scripts\verify-phase166-unified-phone-json-to-closeout-hardening-v1.ps1")
foreach($Rel in $Required){if(!(Test-Path (Join-Path $RepoRoot $Rel))){throw "Missing required file: $Rel"}}
$Native=Get-Content (Join-Path $RepoRoot "scripts\sera-native-command-helpers-v1.ps1") -Raw; $Args=Get-Content (Join-Path $RepoRoot "scripts\sera-powershell-argument-builder-v1.ps1") -Raw; $Loop=Get-Content (Join-Path $RepoRoot "scripts\sera-unified-phone-json-to-closeout-v1.ps1") -Raw; $Doc=Get-Content (Join-Path $RepoRoot "docs\phase166-unified-phone-json-to-closeout-hardening-v1.md") -Raw
foreach($Needle in @("cmd.exe /d /c","exitCode","failed with exit","Native helper self-test")){if($Native -notlike "*$Needle*"){throw "Native helper missing marker: $Needle"}}
foreach($Needle in @("New-SeraArgumentList","IsNullOrWhiteSpace","Start-Process","Argument builder")){if($Args -notlike "*$Needle*"){throw "Argument builder missing marker: $Needle"}}
foreach($Needle in @("REQUEST_READY","WAITING_FOR_ZIP","SKIPPED_STALE","SKIPPED_MALFORMED","SELFTEST_PASS","13_chatgpt_downloads","Branch integrity","phase999_selftest")){if($Loop -notlike "*$Needle*"){throw "Unified loop missing marker: $Needle"}}
foreach($Needle in @("JSON upload","REQUEST_READY","ChatGPT ZIP","13_chatgpt_downloads","QA Guarantee","native Git output on stderr")){if($Doc -notlike "*$Needle*"){throw "Docs missing marker: $Needle"}}
$SelfTest=& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "scripts\sera-unified-phone-json-to-closeout-v1.ps1") -Mode SelfTest -RepoRoot $RepoRoot -AutoOpsRoot $AutoOpsRoot 2>&1; $SelfText=($SelfTest|Out-String)
if($LASTEXITCODE -ne 0 -or $SelfText -notlike "*SELFTEST_PASS*"){throw "Unified phone loop self-test failed: $SelfText"}
$Residue=Get-ChildItem (Join-Path $AutoOpsRoot "00_control_center\command_inbox") -File -Filter "*phase999_selftest*.json" -ErrorAction SilentlyContinue; if($Residue){throw "Self-test residue remains in command_inbox."}
Write-Host "VERIFIER PASS phase166 unified phone JSON-to-closeout hardening"; exit 0
