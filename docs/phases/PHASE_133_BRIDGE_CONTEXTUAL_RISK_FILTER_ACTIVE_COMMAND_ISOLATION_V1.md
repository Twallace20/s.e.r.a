# Phase 133 — Bridge Contextual Risk Filter + Active Command Isolation v1

## Purpose

Repair the final phone-autopilot blocker exposed by the Phase 133 real-life test: the phone command moved through the queue, but the ChatGPT bridge blocked prompt dispatch because the Phase 113 risk filter treated negative safety language as a risky request.

## What changed

- Replaced the bridge's literal keyword-only prompt block with a contextual risk filter.
- Allowed negative safety statements such as “do not,” “must not,” “without,” “stop on,” and “owner judgment” when they appear on the same line as sensitive terms.
- Preserved blocking for non-negated risky requests.
- Improved phone job blocked reasons so missing-handoff failures include runner stdout/stderr tail evidence.

## Real-life proof target

The next test must be run from a phone-saved JSON command. Success is not just parsing the JSON. Success means:

1. The phone command file changes from `new` to `accepted` to `running`.
2. The prompt is actually submitted to the saved ChatGPT target.
3. The overlay ZIP is automatically downloaded and routed.
4. S.E.R.A. applies, validates, and writes a handoff.
5. The command file becomes `complete` on `CLOSED_CLEANLY` or `blocked` with useful evidence.

## Safety

This phase does not remove guarded stops. It reduces false positives caused by safety-language boilerplate while retaining hard stops for actual risky requests.
