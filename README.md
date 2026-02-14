# Clawgency Slot 2 (Professional)

Professional-grade Clawgency: AI-assisted on-chain influencer agency on BNB Chain with milestone escrow, role-based dashboards, OpenClaw workflows, and audit-first safety controls.

## Project Overview

This repository includes:

- `CampaignEscrowV2` smart contract suite for milestone-based campaign escrow.
- Next.js frontend with brand/influencer/admin dashboards.
- OpenClaw local workflows for drafting, proof validation, and monitoring.
- Safe platform-managed Gmail integration (no user Gmail OAuth required).
- Security/sandboxing guidance and logging patterns.
- Automated tests and CI scaffolding.

Human-in-the-loop is mandatory:

- OpenClaw generates recommendations only.
- Transactions are always manually approved in wallet UI.

## Current Deployment

- Network: BNB Testnet
- Contract: `0x1f33F449ddf8E4245EeF30a77Fa1290d408D41C9`
- Verified source: `https://testnet.bscscan.com/address/0x1f33F449ddf8E4245EeF30a77Fa1290d408D41C9#code`

## Directory Layout 

```txt
clawgency-slot2-professional/
|-- contracts/
|   `-- CampaignEscrowV2.sol
|-- scripts/
|   |-- deploy-v2.ts
|   `-- verify-v2.ts
|-- test/
|   `-- CampaignEscrowV2.ts
|-- openclaw/
|   |-- workflows/
|   |   |-- _shared.js
|   |   |-- workflow1-intelligent-drafting.js
|   |   |-- workflow2-proof-validation.js
|   |   |-- workflow3-monitoring.js
|   |   |-- workflow4-email-drafting.js
|   |   |-- workflow5-reply-parsing.js
|   |   |-- sample-workflow1.json
|   |   |-- sample-workflow2.json
|   |   |-- sample-email-draft.json
|   |   `-- sample-email-reply.json
|   |-- schemas/
|   |   |-- email-draft-output.schema.json
|   |   `-- email-reply-parse-output.schema.json
|   |-- tests/
|   |   `-- mock-flows.test.js
|   |-- templates/
|   |   `-- safe-prompt-template.md
|   |-- config/
|   |   `-- user-map.json
|   |-- logs/
|   `-- README.md
|-- frontend/
|   |-- app/
|   |   |-- login/
|   |   |-- brand/dashboard/
|   |   |-- influencer/dashboard/
|   |   |-- admin/analytics/
|   |   |-- api/agent-logs/
|   |   `-- api/email/
|   |-- components/
|   |-- context/
|   |-- lib/
|   `-- tests/
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- SECURITY_SANDBOXING.md
|   |-- TESTING.md
|   |-- DEMO.md
|   `-- CONTRACT_EXPLAINED.md
`-- .github/workflows/ci.yml
```

## Contract Features

`contracts/CampaignEscrowV2.sol` provides:

- `createCampaign(brand, influencer, milestones[], agencyFee)`
- `depositFunds(campaignId)` payable
- `submitProof(campaignId, proofHash)`
- `approveMilestone(campaignId, milestoneIndex)` brand-only
- `releaseFunds(campaignId)` brand-only payout split

Payout split:

- Influencer receives `gross - agencyFee`.
- Agency treasury (`owner`) receives `agencyFee`.

Security modules:

- `Ownable`
- `Pausable`
- `ReentrancyGuard`

Detailed explanation:

- See `docs/CONTRACT_EXPLAINED.md`

## Setup Instructions

### 1) Contracts

```bash
cd clawgency-slot2-professional
npm install
cp .env.example .env
```

Fill `.env`:

```env
PRIVATE_KEY=0x...
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org
ETHERSCAN_API_KEY=...
AGENCY_TREASURY=0xYourAgencyTreasury
CONTRACT_ADDRESS_TESTNET=
CONTRACT_ADDRESS_MAINNET=
EMAIL_PROVIDER_MODE=mock
CLAWGENCY_PLATFORM_EMAIL=agency@clawgency.xyz
GMAIL_ACCESS_TOKEN=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_REFRESH_TOKEN_FILE=.secrets/gmail-refresh-token.json
GMAIL_OAUTH_REDIRECT_URI=http://localhost:3000/api/email/oauth/callback
GMAIL_REPLY_LABEL=clawgency-replies
HUMAN_APPROVAL_LOG_SIGNING_KEY=replace-with-long-random-secret
EMAIL_DRAFT_RATE_LIMIT_PER_MIN=30
EMAIL_SEND_RATE_LIMIT_PER_MIN=20
EMAIL_REPLIES_RATE_LIMIT_PER_MIN=60
EMAIL_APPROVAL_LOG_RATE_LIMIT_PER_MIN=120
```

Build/test:

```bash
npm run build:contracts
npm run test:contracts
```

Deploy:

```bash
npm run deploy:testnet
npm run deploy:mainnet
```

Verify:

```bash
npm run verify:testnet
npm run verify:mainnet
```

### 2) Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Fill `frontend/.env.local`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_USE_TESTNET=true
NEXT_PUBLIC_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.bnbchain.org:8545
NEXT_PUBLIC_BSC_MAINNET_RPC_URL=https://bsc-dataseed.binance.org
NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS=0x...
NEXT_PUBLIC_ADMIN_WALLET=0x...
CONTRACT_ADDRESS_TESTNET=0x...
OPENCLAW_ROOT=../openclaw
EMAIL_PROVIDER_MODE=mock
CLAWGENCY_PLATFORM_EMAIL=agency@clawgency.xyz
GMAIL_ACCESS_TOKEN=
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
GMAIL_REFRESH_TOKEN_FILE=.secrets/gmail-refresh-token.json
GMAIL_OAUTH_REDIRECT_URI=http://localhost:3000/api/email/oauth/callback
GMAIL_REPLY_LABEL=clawgency-replies
HUMAN_APPROVAL_LOG_SIGNING_KEY=replace-with-long-random-secret
EMAIL_DRAFT_RATE_LIMIT_PER_MIN=30
EMAIL_SEND_RATE_LIMIT_PER_MIN=20
EMAIL_REPLIES_RATE_LIMIT_PER_MIN=60
EMAIL_APPROVAL_LOG_RATE_LIMIT_PER_MIN=120
```

Run:

```bash
npm run dev
```

Routes:

- `/login`
- `/brand/dashboard`
- `/influencer/dashboard`
- `/admin/analytics`

### 3) OpenClaw Workflows

Drafting:

```bash
npm run agent:workflow1 -- openclaw/workflows/sample-workflow1.json
```

Proof validation:

```bash
npm run agent:workflow2 -- openclaw/workflows/sample-workflow2.json
```

On-chain monitoring:

```bash
npm run agent:workflow3
```

Email drafting (advisory only):

```bash
npm run agent:workflow4 -- openclaw/workflows/sample-email-draft.json
```

Email reply parsing (advisory only):

```bash
npm run agent:workflow5 -- openclaw/workflows/sample-email-reply.json
```

Frontend API routes for workflows:

- `POST /api/agent/workflow1`
- `POST /api/agent/workflow2`
- `POST /api/agent/workflow3`
- `GET /api/agent/workflow3`

Frontend API routes for platform-managed email:

- `POST /api/email/draft` (OpenClaw drafting only)
- `POST /api/email/send` (backend sends via platform Gmail, explicit human approval gate required)
- `POST /api/email/replies` (read configured label and parse replies)
- `GET /api/email/replies`
- `GET /api/email/approval-logs` (human approval audit trail)
- `GET /api/email/oauth/start` (create one-time Google consent URL)
- `GET /api/email/oauth/start?redirect=1` (redirect directly to consent)
- `GET /api/email/oauth/callback` (token exchange + refresh token persistence)

Logs:

- OpenClaw CLI workflows (local dev): `openclaw/logs/*`
- Frontend API agent logs (serverless-friendly): `os.tmpdir()/clawgency/agent-audit.log` (override with `CLAWGENCY_AGENT_AUDIT_LOG_FILE`)
- Frontend email approval audit logs (serverless-friendly): `os.tmpdir()/clawgency/human-approval.log` (override with `CLAWGENCY_HUMAN_APPROVAL_LOG_FILE`)

One-time OAuth bootstrap (platform Gmail only):

1. Start frontend: `cd frontend && npm run dev`
2. Open `http://localhost:3000/api/email/oauth/start?redirect=1`
3. Complete Google consent with the platform Gmail account
4. Callback stores refresh token to `GMAIL_REFRESH_TOKEN_FILE`
5. Keep `EMAIL_PROVIDER_MODE=live` and leave `GMAIL_ACCESS_TOKEN` empty

Required payload fields for `POST /api/email/send`:

- `humanApprovedBy`
- `humanApprovalConfirmed: true`
- `approvalSessionId`
- optional metadata: `campaignId`, `draftId`

Each send attempt is appended to:

- `os.tmpdir()/clawgency/human-approval.log` (override with `CLAWGENCY_HUMAN_APPROVAL_LOG_FILE`)

Security hardening included:

- HMAC-signed audit rows (`HUMAN_APPROVAL_LOG_SIGNING_KEY`)
- per-route API rate limiting for draft/send/replies/approval-log endpoints

### 4) Agent Onboarding Steps

1. Review `openclaw/templates/safe-prompt-template.md`.
2. Confirm sandbox restrictions (no key access, no auto-send).
3. Configure `openclaw/config/user-map.json`.
4. Run sample workflows and inspect output schema.
5. Enable human approval gate in operations process.

## Testing

Contract tests:

```bash
npm run test:contracts
```

Agent mock tests:

```bash
npm run test:agent
```

Frontend e2e smoke:

```bash
cd frontend
npm run test:e2e
```

Details:

- `docs/TESTING.md`

## Deployment Instructions (BNB)

1. Set `.env` with RPC/private key/treasury.
2. Run `npm run deploy:testnet`.
3. Copy deployed address into:
   - `.env` (`CONTRACT_ADDRESS_TESTNET`)
   - `frontend/.env.local` (`NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS`)
4. Verify with `npm run verify:testnet`.
5. Start frontend and run demo from `docs/DEMO.md`.

## Deploy On Vercel

Deploy the Next.js app (including API routes):

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel: New Project -> Import Repo.
3. Set **Root Directory** to `frontend`.
4. Set **Build Command** to `npm run build` and **Install Command** to `npm ci`.
5. Configure Environment Variables (Project Settings -> Environment Variables) using `frontend/.env.local.example` as the template.

Notes:

- For a safe demo deployment, keep `EMAIL_PROVIDER_MODE=mock` (no Gmail credentials required).
- If you enable live Gmail, store secrets in Vercel env vars (do not rely on writing `GMAIL_REFRESH_TOKEN_FILE` on serverless).
- Serverless filesystem is ephemeral: `/api/agent-logs` and `/api/email/approval-logs` are best-effort unless you wire them to durable storage.

## Known Limitations

- Single contract deployment (no proxy upgrade pattern in this version).
- Proof validation is format/heuristic-based, not content-forensic.
- Monitoring script is polling-based (not a long-running daemon).
- Frontend analytics aggregates on-chain state without external BI backend.
- Email integration uses a single platform account and does not support per-tenant inboxes yet.

## Security Considerations

- Never expose private keys to OpenClaw runtime.
- Keep AI outputs advisory only.
- Require manual operator confirmation for state-changing transactions.
- Keep audit logs immutable and retained.
- Do not pass Gmail OAuth/user secrets to OpenClaw workflows.
- Moltbot never sends email directly; backend-only email send path is enforced.

See:

- `docs/SECURITY_SANDBOXING.md`
- `docs/EMAIL_INTEGRATION.md`
