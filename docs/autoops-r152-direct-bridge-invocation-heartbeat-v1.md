# AutoOps R152 - Direct Bridge Invocation Heartbeat v1

R152 is a direct follow-up to R151. R151 proved command/prompt/request/lease creation and Chrome remote debugging, but it launched the historical watcher VBS. The diagnostic showed that launcher was not truly raw; it pointed to the Phase 138 safe wrapper with a Phase 138 default ZIP name.

R152 adds a one-shot runner that resolves the Phase 138 wrapper stack, invokes the wrapper directly with the active Phase 143 expected ZIP, writes heartbeat files while waiting, and blocks with a short, explicit reason when the ZIP does not appear. It does not turn scheduled tasks on and does not call Start-ScheduledTask.
