# Studio Runtime v1

Studio Runtime is a Runtime service for certified user-facing Studios. It owns Studio registry, exact version digests, session lifecycle, append-only stage transitions, artifact lineage, review state, immutable package evidence, candidate learning-signal routing, and Studio health.

It is not a Control Plane, model provider, direct tool runner, browser UI, or direct source of truth for broader attempt success. Unified Control Plane keeps authorization and final attempt authority. Runtime State owns durable SQLite truth. Knowledge, Model, Capability, and Evaluation services keep their own authority.

Milestone 12 certifies one profile: `source-grounded-professional-brief-v1`. The runtime registers exact Studio definitions, blocks unpinned latest references, requires authorization binding request hash, source-set hash, Studio digest, model policy, capability versions, evaluation profile, risk class, and revision budget.

Studio sessions move through created, authorization, intake, scoping, retrieval, planning, generation, evaluation, review, revision, finalization, and terminal states. Stage transitions are append-only. Terminal sessions are immutable. Model completion, draft creation, passing evaluation, or operator approval alone never means the session or parent attempt is complete.

The runtime writes immutable output packages under `.sera/studios/` and excludes generated Studio evidence from source control. Learning signals remain candidate-only. Milestone 12 does not certify active recurrence prevention, reusable lessons, innovation promotion, public web research, PDF rendering, distributed Studios, Hive Mode, or the Milestone 13 integrated offline loop.
