# Clawgency Slot 2 (Professional)

Professional-grade Clawgency: AI-assisted on-chain influencer agency on BNB Chain with milestone escrow, role-based dashboards, OpenClaw workflows, and audit-first safety controls.

## Project Overview

This repository includes:

- `CampaignEscrowV2` smart contract suite for milestone-based campaign escrow.
- Next.js frontend with brand/influencer/admin dashboards.
- OpenClaw local workflows for drafting, proof validation, and monitoring.
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
|   |   |-- sample-workflow1.json
|   |   `-- sample-workflow2.json
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
|   |   `-- api/agent-logs/
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

Logs are written to:

- `openclaw/logs/agent-audit.log`

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

## Known Limitations

- Single contract deployment (no proxy upgrade pattern in this version).
- Proof validation is format/heuristic-based, not content-forensic.
- Monitoring script is polling-based (not a long-running daemon).
- Frontend analytics aggregates on-chain state without external BI backend.

## Security Considerations

- Never expose private keys to OpenClaw runtime.
- Keep AI outputs advisory only.
- Require manual operator confirmation for state-changing transactions.
- Keep audit logs immutable and retained.

See:

- `docs/SECURITY_SANDBOXING.md`
