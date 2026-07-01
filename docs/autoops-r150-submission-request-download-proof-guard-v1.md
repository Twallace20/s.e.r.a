# AutoOps R150 — Submission Request + Download Proof Guard v1

R150 repairs the post-lease gap discovered after R149. R149 could create a canonical prompt and lease, but the raw artifact watcher did not receive a fresh `artifact-watch-request.json`, so no ZIP was downloaded or routed.

R150 installs in front of `SERA ChatGPT Artifact Watcher` and, for an active phone command, makes the command contract authoritative:

1. builds or reuses the canonical Phase bridge prompt;
2. writes `00_control_center/artifact-watch-request.json` before browser submission;
3. launches the raw saved ChatGPT watcher exactly once per command/prompt;
4. watches for the exact expected ZIP in AutoOps downloads, user Downloads, or apply-approved;
5. routes the stable ZIP to `01_apply_approved`; and
6. updates `generation-lease.json` only after download/routing proof exists.

It preserves saved-target-only mode and keeps random recent chat and new chat fallback disabled.
