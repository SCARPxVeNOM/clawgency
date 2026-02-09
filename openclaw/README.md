# OpenClaw Local Operations

## Purpose

OpenClaw scripts provide deterministic, auditable recommendations for:

- campaign drafting
- proof validation
- on-chain monitoring

They do not sign or send transactions.

## Secure Local Run

1. Keep private keys out of OpenClaw runtime environment.
2. Use read-only RPC endpoints.
3. Restrict filesystem access to `openclaw/` directories.
4. Keep `openclaw/logs/agent-audit.log` append-only.

## Commands

From repository root:

```bash
npm run agent:workflow1 -- openclaw/workflows/sample-workflow1.json
npm run agent:workflow2 -- openclaw/workflows/sample-workflow2.json
npm run agent:workflow3
```

## Outputs

- Workflow 1: structured campaign draft + transaction proposal
- Workflow 2: proof validity suggestion (`approve` / `reject`)
- Workflow 3: event monitoring alerts + recommendations

## Logs

Audit logs are written as JSON lines:

- `openclaw/logs/agent-audit.log`

Each entry includes:

- `timestamp`
- `workflow`
- `userId`
- `chainEventHash`
- `recommendation`
