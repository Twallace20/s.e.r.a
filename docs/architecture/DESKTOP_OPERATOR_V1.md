# Desktop Operator v1

Milestone 11 implementation target: `desktop-operator-v1`.

Desktop Operator v1 adds a private, local-first graphical control surface and a loopback-only Operator Gateway. The desktop app is a local asset bundle with no remote references. The gateway owns session validation, approval review, request composition, event polling, notification records, and safe evidence viewing.

## Boundaries

- Binds only to loopback.
- Uses Runtime State schema v8 for operator records.
- Stores only token hashes, never raw durable session tokens.
- Requires explicit session and CSRF checks for state-changing routes.
- Does not run shell commands, invoke models, fetch public URLs, approve work automatically, promote capabilities automatically, roll back automatically, or mutate SQLite directly from the UI.
- Active imported HTML evidence is never rendered.
- Explicit blocked authorities include: does not run shell commands, no automatic promotion, no automatic rollback, and no active imported HTML rendering.
- Reserves governed empty-state surfaces for recurrence prevention and innovation review without fabricating lesson data.
- Exposes Evidence Studio panels for catalog, details, session progress, source set, document plan, candidate draft, claim ledger, source map, evaluation results, operator review, revision history, final deliverable, learning signals, limitations, and certification.

## Runtime Role

`@sera/operator-gateway` is a Runtime-layer subsystem because it mediates local operator control through durable state, audit events, and Runtime Host registration.

`@sera/desktop-operator` is a Desktop-layer app because it provides the local graphical surface and static assets.

## Certification

Desktop Operator v1 is certified by:

- local-only asset integrity checks;
- loopback bind enforcement;
- session and CSRF proof;
- approval queue proof;
- evidence traversal and active HTML blocking proof;
- notification/event proof;
- Runtime Host service registration;
- repeatable isolated CLI proofs.

## Governed Recurrence Prevention Surfaces

Milestone 11 reserves Desktop Operator visual contract surfaces for:

- known failure patterns;
- applicable lessons;
- prevention warnings;
- certified alternatives;
- operator overrides;
- superseded lessons;
- improvement proposals;
- innovation proposals;
- supporting evidence;
- applicability explanations;
- non-applicability explanations.

These surfaces are UI contract reservations only. Desktop Operator v1 may render honest empty states until later Runtime milestones implement certified recurrence-prevention, lesson retrieval, override, supersession, and innovation records.

Desktop Operator v1 does not activate lessons, create prevention rules, promote innovation, infer lesson applicability, or replace Control Plane authority.

Milestone 12 adds Studio surfaces to the Desktop Operator visual contract. These surfaces route state-changing actions through Operator Gateway and Studio Runtime; browser code still does not directly finalize Studio sessions or write Studio state.

Milestone 13 adds Integrated Offline Loop surfaces for loop composition, sessions, timeline, authorization, learning preflight, applicable and non-applicable records, prevention warnings, certified alternatives, governed overrides, source intake, knowledge retrieval, Studio and capability selection, model candidates, evaluation summary, review revisions, finalization, closeout, and evidence packages. These surfaces remain visual/operator surfaces only; browser code does not run the loop, mutate SQLite directly, certify lessons, activate prevention rules, invoke real models, or promote innovation.
