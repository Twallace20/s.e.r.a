$ErrorActionPreference = "Stop"

powershell -ExecutionPolicy Bypass -File ".\scripts\phase114-build-bridge-prompt.ps1" `
  -Mode Normal `
  -NextPhaseNumber "115" `
  -NextPhaseName "Intentional Blocked Repair Loop Smoke Test v1"
