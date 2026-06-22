# Phase 46 — Private Operator App Shell v1

## Purpose

Phase 46 starts the private app era for S.E.R.A. It adds the first repo-owned web app shell under `apps/operator-console/` so the owner can supervise S.E.R.A. through a polished local command center instead of only through terminal output.

The app is not a public SaaS product. It is a private operator dashboard for one owner to supervise local desktop automation, overnight development tasks, GitHub branches, file intake, safety gates, evidence bundles, approval decisions, and morning review packets.

## Build direction

Phase 46 is a design-assisted frontend shell built with:

- Vite
- React
- TypeScript
- CSS with Tailwind/shadcn-style design language
- portable repo-owned components
- realistic sample data

The visual direction is dark mode first, premium, calm, sharp, trustworthy, slightly futuristic, closer to Linear, Vercel, GitHub Actions, Cloudflare, and Raycast than a generic admin panel.

## What Phase 46 adds

Phase 46 adds:

- `apps/operator-console/` private app workspace
- left sidebar navigation
- top status bar
- command center dashboard
- right-side review panel
- system status card
- create request panel
- overnight queue preview
- safety gates
- morning review packet preview
- recent activity feed
- file intake shell
- Phase 46 verification script
- Phase 46 integration test
- Phase 46 docs with build instructions and future sequence

## What Phase 46 intentionally does not add

Phase 46 intentionally does not add backend logic, authentication, command execution, runner connectivity, source mutation, branch operations, auto-merge, cloud hosting, secrets, or iOS/native app delivery.

This phase is an app shell only. It must remain local-first, frontend-only, private-app-only, and free-core compatible.

## Private operator dashboard modules

The shell includes placeholders for:

- Command Center
- Requests
- Overnight Queue
- Workflows
- Files
- Evidence
- Safety Gates
- Branches
- Settings

The deeper screens remain placeholders because Phase 47 and later phases will wire real runtime data, request intake, file intake, workflow libraries, and workflow composition.

## How to build Phase 46

Start from a clean Phase 45 main branch:

```powershell
cd C:\Users\18123\Documents\SERA-Core\s.e.r.a

git status
git switch main
git pull origin main
git switch -c phase-46-private-operator-app-shell-v1
```

Apply the Phase 46 overlay, then run:

```powershell
npm install --ignore-scripts --no-audit --no-fund
npm run knowledge:verify
npm run phase46:demo
npm run phase46:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
git status
```

Expected proof:

```text
S.E.R.A. phase46 private operator app shell v1: PASS
privateOperatorAppShellStatus: ready
validationFailedCount: 0
declaredFileCount: 12
layoutSectionCount: 4
dashboardModuleCount: 10
appSurfaceCount: 9
safetyGateCount: 8
localOnly: true
privateAppOnly: true
appShellOnly: true
designAssistedShell: true
frontendOnly: true
noBackendLogic: true
noAuthentication: true
freeCoreCompatible: true
commandExecutionAllowed: false
runnerConnectivityAllowed: false
mutatesSource: false
autoMergeAllowed: false
selfApprovalAllowed: false
```

## How to preview the private app locally

After Phase 46 is validated and committed, preview the app locally:

```powershell
npm run operator:dev
```

Then open the local Vite URL shown in the terminal, usually:

```text
http://127.0.0.1:5173
```

Build the app with:

```powershell
npm run operator:build
```

Preview the production build with:

```powershell
npm run operator:preview
```

## Commit and closeout

Once validation is green:

```powershell
git add .
git commit -m "feat: add Private Operator App Shell v1"
git push -u origin phase-46-private-operator-app-shell-v1
```

Merge and tag after review:

```powershell
git switch main
git pull origin main
git merge --no-ff origin/phase-46-private-operator-app-shell-v1 -m "merge: add Private Operator App Shell v1"

npm run phase46:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify

git push origin main

git tag phase-46-private-operator-app-shell-v1
git push origin refs/tags/phase-46-private-operator-app-shell-v1:refs/tags/phase-46-private-operator-app-shell-v1

git push origin :refs/heads/phase-46-private-operator-app-shell-v1
git branch --delete phase-46-private-operator-app-shell-v1

git status
git branch -r
git tag --list
```

## Next sequence

Phase 47 reads real S.E.R.A. runtime artifacts into the private app.

Phase 48 adds request intake.

Phase 49 adds file intake.

Phase 50 adds the workflow library.

Phase 51 adds the development workflow composer.

Phase 46 is complete only when the app shell exists, the verification script passes, the integration test passes, build/test/certify/verify pass, and the repo returns to a clean main branch.
