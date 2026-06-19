# S.E.R.A. Free Core Covenant

S.E.R.A. must remain fully operational without paid subscriptions, paid APIs, paid SaaS tools, or cloud-only dependencies through Phase 45.

Paid services may exist only as optional adapters after the free/local path is certified.

## Certification law

1. Core S.E.R.A. must run locally.
2. No required paid API keys.
3. No required OpenAI, Anthropic, Copilot, Cursor, Replit, cloud database, hosted vector database, paid automation platform, or paid SaaS account.
4. All certified capabilities must work with local files, local models, local storage, and open/free libraries.
5. Paid providers can be optional adapters only.
6. A phase cannot be certified if its main feature requires a paid subscription.
7. Any paid integration must have a free/local fallback before it is allowed into the main roadmap.

## Operational meaning

S.E.R.A. must be able to run locally, store memory locally, index knowledge locally, search knowledge locally, plan tasks locally, run certification locally, self-improve through local tests, create local workers/tools, write local reports, and operate from local interfaces without a paid service.

## Provider rule

Model providers must follow this order:

1. deterministic local mock provider for certification
2. optional local model provider adapter
3. optional paid or external provider adapter only after the free/local path is certified

External providers must never become a core dependency.

## CI rule

The primary certification path is local:

```bash
npm run certify
npm run verify
```

GitHub Actions or other hosted runners may be optional. A self-hosted local runner must remain a valid strict-free path.
