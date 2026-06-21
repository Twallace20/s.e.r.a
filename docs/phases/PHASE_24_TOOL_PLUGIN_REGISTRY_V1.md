# Phase 24 — Tool / Plugin Registry v1

## Status

Planned validation target: `phase-24-tool-plugin-registry-v1`.

## Purpose

Phase 24 gives S.E.R.A. a local registry for tools, plugins, adapters, workers, and scripts. The registry records what each capability is, what it is allowed to do, what permissions it needs, whether it belongs in the free/local core, and whether it requires operator approval.

This is a governance layer, not a new autonomy layer.

## What Phase 24 Adds

- Local registry directory: `.sera-tools/`
- Registry file: `.sera-tools/registry.json`
- Registry event log: `.sera-tools/events.jsonl`
- Registry reports: `.sera-tools/reports/`
- Tool/plugin manifest validation
- Permission and mutation-authority classification
- Free-core eligibility assessment
- Risk level classification
- Approval-required classification
- Disabled optional external adapter tracking

## Boundary

Phase 24 does not add mutation authority. It does not approve tools. It does not execute plugins. It does not call paid APIs, hosted model providers, SaaS, or cloud-only services. It records local metadata and writes local evidence artifacts only.

## Validation

Required commands:

```bash
npm run phase24:demo
npm run phase24:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

Expected result:

```text
S.E.R.A. phase24 tool plugin registry v1: PASS
S.E.R.A. knowledge source map: PASS mapped=50
Test Files 22 passed
S.E.R.A. certify: PASS level=operator-console-v1
```

## Completion Criteria

Phase 24 is complete when the registry initializes locally, registers representative tools, separates free-core-safe local tools from optional external/cloud adapters, writes local summary artifacts, passes integration tests, and leaves the full validation gate green.
