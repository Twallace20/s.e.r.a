# Phase183 - Opt-in Auto Watcher Startup Proof

## Purpose

Phase183 adds an explicit opt-in automatic startup mode for the S.E.R.A. command inbox watcher.

After this phase is enabled once on the PC, the intended operating flow is:

1. The Windows user signs in and OneDrive is syncing.
2. The opt-in current-user scheduled task starts the S.E.R.A. command inbox watcher.
3. The user saves or uploads a JSON command into `OneDrive\SERA-AutoOps\00_control_center\command_inbox`.
4. S.E.R.A. detects the JSON, submits the prompt, waits for the exact ZIP, applies the overlay, verifies, QA checks, posts the final handoff, and only merges after gates pass.

## Safety model

This phase intentionally avoids a Windows Service. It uses a current-user scheduled task at logon because it is visible, reversible, local, and does not require storing credentials.

Allowed by explicit user approval:

- A current-user scheduled task named `SERA AutoOps Command Inbox Watcher`.
- A logon trigger for the current interactive user.
- A least-privilege action that launches `SERA_START_WATCHER_NOW.ps1`.

Still prohibited:

- Windows service creation.
- SYSTEM run-as.
- Credential/password storage.
- Admin-only elevation.
- Startup folders, registry run keys, or hidden persistence outside this explicit scheduled task.
- Tokens, secrets, paid services, dependency installs, or security setting changes.
- Random ChatGPT fallback or new chat fallback.

## User scripts

- `SERA_ENABLE_AUTO_WATCHER.ps1` turns on automatic startup.
- `SERA_DISABLE_AUTO_WATCHER.ps1` stops and unregisters the task.
- `SERA_AUTO_WATCHER_STATUS.ps1` reports task state, task info, logs, and inbox paths.
- `SERA_START_WATCHER_NOW.ps1` starts the watcher immediately with a single-instance guard.

## Expected user flow after Phase183 closes cleanly

```powershell
$Repo = "C:\Users\18123\Documents\SERA-Core\s.e.r.a"
$AutoOps = "$env:USERPROFILE\OneDrive\SERA-AutoOps"

powershell -NoProfile -ExecutionPolicy Bypass `
  -File "$Repo\SERA_ENABLE_AUTO_WATCHER.ps1" `
  -RepoRoot $Repo `
  -AutoOpsRoot $AutoOps `
  -LaunchBrowserIfNeeded
```

Then check status:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File "$Repo\SERA_AUTO_WATCHER_STATUS.ps1" `
  -RepoRoot $Repo `
  -AutoOpsRoot $AutoOps
```

Disable anytime:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File "$Repo\SERA_DISABLE_AUTO_WATCHER.ps1" `
  -RepoRoot $Repo `
  -AutoOpsRoot $AutoOps
```
