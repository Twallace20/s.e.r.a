# Bridge Contextual Risk Filter + Active Command Isolation v1

The phone autopilot bridge now distinguishes between a risky request and a safety boundary that mentions a risky term in a negative context.

Example safety boundary allowed:

```text
Stop on owner judgment, browser failure, download failure, validation failure, or missing handoff.
```

Example risky request still blocked:

```text
Set up billing for a paid service.
```

This supports the real phone workflow without requiring the owner to manually rewrite every safe command to avoid harmless safety terminology.
