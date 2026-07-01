# AutoOps R151 - Single Flow Orchestrator v1

R151 replaces the repeated scheduled-task toggle workflow with one controlled proof runner for the Phase 143 phone/autopilot smoke test.

The orchestrator accepts or generates one command, creates the canonical prompt, writes `artifact-watch-request.json`, writes `generation-lease.json`, verifies the browser execution gate before claiming submission, submits through the saved ChatGPT raw watcher only when the explicit execution gate is available, waits for the exact expected ZIP, routes it to `01_apply_approved`, starts the direct local AutoOps runner path, and waits for a Phase 143 handoff.

It blocks honestly when Chrome remote debugging, the execute gate, the exact ZIP, or the handoff is missing. It does not depend on `Start-ScheduledTask`.

Run after install/merge:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\autoops-r151-single-flow-orchestrator-v1.ps1 -RepoRoot "C:\Users\18123\Documents\SERA-Core\s.e.r.a" -AutoOps "$env:USERPROFILE\OneDrive\SERA-AutoOps" -RunPhase143SmokeTest
```
