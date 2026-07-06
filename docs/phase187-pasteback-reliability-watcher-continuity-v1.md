# Phase 187 - Pasteback Reliability and Watcher Continuity

This phase is a stability patch for the AutoOps harness.

It is not the final no-rescue proof. The final proof should come after this patch lands.

## Patches included

1. **Watcher continuity**
   - Blocked or failed command runs write their handoff and then return to watch mode.
   - The approved runner stays alive for the next command.
   - The old behavior where a failed run permanently stopped the watcher is removed.

2. **Startup backlog scan**
   - When the watcher starts, it scans existing `command_inbox` files.
   - A command JSON already present before the runner starts can be detected and processed.

3. **Command JSON routing from downloads**
   - Safe `autopilot-command-*.json` files in `13_chatgpt_downloads` are routed to `00_control_center/command_inbox`.
   - Overlay manifests, proof JSON, package metadata JSON, and arbitrary JSON are rejected.
   - Routing is idempotent and uses route state.

4. **Pasteback reliability**
   - Pasteback retries internally for transient browser/CDP failures before blocking.
   - Retryable failures include `Promise was collected`, `send_button_not_found`, composer readiness, send control readiness, stale target focus, and no string value from CDP.
   - `PASTEBACK_POSTED_TEXT_MATCH` remains the success gate.

## Safety

This phase does not add a service, admin-only install, credentials, tokens, paid services, dependency installs, security-setting changes, or a new persistence mechanism. It uses the already-approved StartupFallback/runner model.

## Next phase

Phase188 should be the true no-rescue phone-only proof.
