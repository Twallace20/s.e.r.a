# Operator Control Plane v1

Status: Architecture / owner-review aligned.

The Operator Control Plane is the visible, approval-first nervous system for S.E.R.A. It prevents the project from becoming command-prompt-only and gives the owner a clear way to review work, approvals, blockers, evidence, and future away-mode activity.

## Surfaces

| Surface | Role |
| --- | --- |
| CLI / scripts | Validation, certification, local demos, and reproducible proof. |
| Operator console | Current internal visibility surface for system status and phase packets. |
| Private S.E.R.A. Studio | Future daily dashboard for projects, approvals, deliverables, and evidence. |
| Public website | Future service, proof, portfolio, intake, and trust surface. |
| Mobile web / PWA companion | Future phone-friendly approvals, status, evidence, and emergency stop. |
| Native app | Optional later app after the mobile web/PWA proves the workflow. |

## Required control-plane views

- Approval inbox.
- Project queue.
- Branch plan queue.
- Command approval packets.
- Evidence viewer.
- Blocked action viewer.
- Validation/certification history.
- Deliverable workspaces.
- Source and knowledge packs.
- Operator decisions.
- Away-mode proposed work queue.
- Emergency stop and pause state.

## Safety model

The control plane does not unlock execution by itself. It makes execution reviewable, reversible, and observable before higher autonomy is allowed.

A future action should show:

1. What S.E.R.A. wants to do.
2. Why it is in scope.
3. What files/tools/surfaces it needs.
4. What risks exist.
5. What validation will prove success.
6. What rollback exists.
7. What evidence will be captured.
8. What owner decision is required.

## Website path

The existing site should be used once S.E.R.A. can produce credible service proof, portfolio examples, case studies, service pages, and intake workflows. The website is not the operator brain; it is the public trust and demand surface.

## App path

The app path should start as a mobile web/PWA approval companion. Native app work should follow only after the approval, status, evidence, and emergency-stop workflows prove useful.

## Self-development path

S.E.R.A. may eventually help build herself through approved branches. That path must require branch plans, owner approval, validation evidence, rollback, merge approval packets, and no self-merge authority.

## Away-mode path

Away mode may prepare work while the owner is away only inside approved scope. It should produce progress packets and wait for owner approval where authority matters.
