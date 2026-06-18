# System Architecture

S.E.R.A. uses a layered local-first architecture.

```txt
User / CLI / Console
        ↓
Worker Modules
        ↓
Kernel
        ↓
Safety Policy
        ↓
Tool Adapters
        ↓
Workspace + Artifacts
```

## Kernel

The kernel owns task lifecycle. It should remain small and stable.

## Safety

Safety owns permissions, workspace boundaries, command allowlists, approvals, and redaction.

## Tools

Tools are the only way S.E.R.A. acts on the environment. Every tool call must be logged.

## Workspace

Work happens inside isolated run workspaces.

## Artifacts

Artifacts are the evidence trail that proves what happened.

## Workers

Workers are specialized modules built on top of the kernel. The first planned worker is Developer Worker.
