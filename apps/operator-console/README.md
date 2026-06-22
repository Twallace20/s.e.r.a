# S.E.R.A. Private Operator Console

This app is the Phase 46 private operator dashboard shell for S.E.R.A.

It is a local/private web app, not a public SaaS product. It is designed for one owner to supervise local desktop automation, overnight development tasks, GitHub branches, file intake, safety gates, evidence bundles, approval decisions, and morning review packets.

## Stack

- Vite
- React
- TypeScript
- CSS using a Tailwind/shadcn-style design language
- Repo-owned portable components

## Phase 46 boundaries

Phase 46 is frontend-only and app-shell-only.

It does not add:

- backend logic
- authentication
- command execution
- runner connectivity
- source mutation
- branch operations
- auto-merge
- cloud hosting
- iOS/native app delivery

## Local development

From the repository root:

```powershell
npm install --ignore-scripts --no-audit --no-fund
npm run operator:dev
```

Open the Vite URL printed in the terminal, usually:

```text
http://127.0.0.1:5173
```

## Build

```powershell
npm run operator:build
```

## Preview production build

```powershell
npm run operator:preview
```

## Phase validation

From the repository root:

```powershell
npm run phase46:verify
npm run hygiene
npm run build
npm test
npm run certify
npm run verify
```

## Next phases

- Phase 47 wires real runtime artifact reading.
- Phase 48 adds request intake.
- Phase 49 adds file intake.
- Phase 50 adds workflow library support.
- Phase 51 adds development workflow composition.
