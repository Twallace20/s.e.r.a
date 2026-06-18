# Run Artifact Schema

Every run should produce a folder under `.sera-runs/`.

```txt
.sera-runs/
  run_<id>/
    workspace/
    task.json
    plan.json
    run.json
    steps.jsonl
    tool-events.jsonl
    safety-events.jsonl
    final-report.json
    final-report.md
```

## JSONL events

JSONL is used for event streams because it is append-friendly, inspectable, and easy to migrate to SQLite later.
