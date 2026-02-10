# OpenClaw Local Operations

## Purpose

OpenClaw scripts provide deterministic, auditable recommendations for:

- campaign drafting
- proof validation
- on-chain monitoring
- email drafting (advisory)
- email reply parsing (advisory)

They do not sign or send transactions, and they do not send emails.

## Secure Local Run

1. Keep private keys out of OpenClaw runtime environment.
2. Use read-only RPC endpoints.
3. Restrict filesystem access to `openclaw/` directories.
4. Keep `openclaw/logs/agent-audit.log` append-only.
5. Never pass Gmail OAuth tokens or inbox credentials to workflow input.

## Commands

From repository root:

```bash
npm run agent:workflow1 -- openclaw/workflows/sample-workflow1.json
npm run agent:workflow2 -- openclaw/workflows/sample-workflow2.json
npm run agent:workflow3
npm run agent:workflow4 -- openclaw/workflows/sample-email-draft.json
npm run agent:workflow5 -- openclaw/workflows/sample-email-reply.json
```

## Outputs

- Workflow 1: structured campaign draft + transaction proposal
- Workflow 2: proof validity suggestion (`approve` / `reject`)
- Workflow 3: event monitoring alerts + recommendations
- Workflow 4: structured campaign outreach email draft
- Workflow 5: structured influencer reply classification (`yes` / `no` / `maybe`)

## Logs

Audit logs are written as JSON lines:

- `openclaw/logs/agent-audit.log`

Each entry includes:

- `timestamp`
- `workflow`
- `userId`
- `chainEventHash`
- `recommendation`
