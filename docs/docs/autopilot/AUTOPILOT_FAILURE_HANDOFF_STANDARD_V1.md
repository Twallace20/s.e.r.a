# Autopilot Failure Handoff Standard v1

Phase201 makes rich handoffs mandatory for both success and failure.

## BLOCKED handoff required fields

- Reason
- InnerFailure
- FullErrorRecord
- InvocationInfo
- PositionMessage
- ScriptStackTrace
- ChildCommandLine
- ChildStdout
- ChildStderr
- CurrentBranch
- RepoStatus
- LatestRelevantHandoff

## PASS handoff required fields

- ZIP path
- ZIP SHA
- HEAD
- origin/main
- local tag commit
- remote tag commit
- verifier handoff path
- QA handoff path
- repo status

## Why this exists

Phase200 repeatedly produced thin handoffs that hid the actual inner failure. Phase201 requires handoffs to be sufficient for another chat/operator to continue without rerunning broad diagnostics.

## Marker validity rule

A final marker is invalid if any earlier command in the same pasted run failed and execution continued. A gate is valid only when its exit code, handoff, and repo state agree.
