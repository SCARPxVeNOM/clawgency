# Till Updates - Clawgency Project Full Technical Snapshot

This file documents what is currently included in your Clawgency project, how it works, and how all parts connect.

## 1) Project Scope

This repository is the professional Slot 2 build:

- Path: `C:\Users\aryan\clawgency-slot2-professional`
- Companion MVP project also exists separately:
  - `C:\Users\aryan\clawgency-slot1-mvp`

Slot 2 includes:

- Milestone-based escrow smart contract suite on BNB Chain.
- Next.js frontend with role-based dashboards.
- OpenClaw local agent workflows (drafting, proof validation, monitoring).
- Human-in-the-loop transaction safety.
- Audit logs for agent recommendations and observed chain activity.
- Hardhat and Playwright-based automated tests.

## 2) Tech Stack

- Smart contracts: Solidity `0.8.24`, OpenZeppelin.
- Contract tooling: Hardhat, ethers v6.
- Frontend: Next.js 14, React 18, Tailwind CSS.
- Wallet + chain integration: wagmi, viem, RainbowKit.
- Agent workflows: Node.js scripts in `openclaw/workflows`.
- E2E tests: Playwright.

## 3) Directory Inventory

Main structure:

- `contracts/`
  - `CampaignEscrowV2.sol`
- `scripts/`
  - `deploy-v2.ts`
  - `verify-v2.ts`
- `test/`
  - `CampaignEscrowV2.ts`
- `openclaw/`
  - `workflows/` (workflow1, workflow2, workflow3, shared helpers)
  - `tests/` (mock flow tests)
  - `templates/` (safe prompt templates)
  - `config/user-map.json`
  - `logs/` (runtime audit/state files)
- `frontend/`
  - `app/` (pages + API routes)
  - `components/` (reusable UI + tx controls)
  - `context/` (role/session + tx logs)
  - `lib/` (contract reads/writes + OpenClaw server runner)
  - `tests/` (Playwright smoke/API/UI flow tests)
- `docs/`
  - `ARCHITECTURE.md`
  - `SECURITY_SANDBOXING.md`
  - `TESTING.md`
  - `DEMO.md`
  - `CONTRACT_EXPLAINED.md`

## 4) Smart Contract (Core Logic)

File:

- `contracts/CampaignEscrowV2.sol`

### 4.1 State Model

Each campaign stores:

- `brand`
- `influencer`
- `totalMilestoneAmount`
- `totalEscrowed`
- `totalReleased`
- `agencyFeeBps`
- `reputationScore`
- `state` (`Created`, `Funded`, `Completed`, `Cancelled`)
- `milestoneAmounts[]`
- `milestoneApproved[]`
- `milestonePaid[]`
- `milestoneProofHashes[]`

Global state:

- `campaignCount`
- `_campaigns` mapping
- `influencerReputation` mapping

### 4.2 Main Functions

- `createCampaign(brand, influencer, milestones, agencyFee)`
  - Validates addresses, milestones, fee bounds.
  - Initializes campaign and milestone arrays.
- `depositFunds(campaignId)` payable
  - Only campaign brand.
  - Updates escrow amount and sets state to `Funded` once fully covered.
- `submitProof(campaignId, proofHash)`
  - Only campaign influencer.
  - Submits proof for next unpaid milestone needing proof.
- `approveMilestone(campaignId, milestoneIndex)`
  - Only campaign brand.
  - Requires proof to exist and milestone not already approved.
- `releaseFunds(campaignId)`
  - Only campaign brand.
  - Releases all approved and unpaid milestones.
  - Splits payout between influencer and agency treasury (`owner()`).
  - Updates campaign completion and influencer reputation.
- View helpers:
  - `getCampaign(campaignId)`
  - `getMilestone(campaignId, milestoneIndex)`
- Admin safety:
  - `pause()`, `unpause()` via `onlyOwner`

### 4.3 Security Features

- `Ownable` for agency governance and treasury ownership.
- `ReentrancyGuard` on release path.
- `Pausable` emergency stop.
- Custom errors for strict, cheap revert paths.
- Checks-effects-interactions in payout flow.

### 4.4 Events

- `CampaignCreated`
- `FundsDeposited`
- `ProofSubmitted`
- `MilestoneApproved`
- `FundsReleased`

### 4.5 Deployed Contract (Testnet)

- Address: `0x1f33F449ddf8E4245EeF30a77Fa1290d408D41C9`
- BscScan: `https://testnet.bscscan.com/address/0x1f33F449ddf8E4245EeF30a77Fa1290d408D41C9#code`

## 5) Hardhat Deployment + Verification Logic

Files:

- `hardhat.config.ts`
- `scripts/deploy-v2.ts`
- `scripts/verify-v2.ts`

What is implemented:

- BNB testnet + mainnet network config.
- Deployment script with treasury owner constructor arg.
- Optional automatic verification after deploy (if API key exists).
- Separate explicit verify script using configured contract address.

## 6) Frontend Product Logic

### 6.1 App Pages

- `/login`
  - Wallet connect and role selection.
- `/brand/dashboard`
  - AI draft campaign proposal.
  - Create campaign.
  - Deposit escrow.
  - Approve milestones.
  - Release approved funds.
- `/influencer/dashboard`
  - View assigned campaigns.
  - Validate proof with AI.
  - Submit proof on-chain.
- `/admin/analytics`
  - Campaign metrics.
  - Trigger monitoring scan.
  - View agent logs and recommendations.

### 6.2 Role and Session Control

File:

- `frontend/context/SessionContext.tsx`

What it does:

- Maintains role (`brand`, `influencer`, `admin`) in local storage.
- Tracks connected wallet.
- Auto-enables admin role for configured admin wallet.
- Powers route-level guard behavior via `RoleGuard`.

### 6.3 Contract Interaction

Core files:

- `frontend/lib/contract.ts` (ABI + contract address)
- `frontend/lib/campaigns.ts` (reads + event subscriptions)
- `frontend/lib/useContractActions.ts` (writes + tx receipt + logs + friendly errors)

Current UX logic includes:

- Milestone input validation before campaign creation.
- Agency fee bounds check before tx.
- Deposit guardrails:
  - Must select valid active campaign.
  - Prevent zero/invalid amount.
  - Prevent over-deposit beyond remaining required escrow.
- Friendly error translation from contract selectors and wallet rejections.

### 6.4 UI Safety Components

Key components:

- `ContractButton` (modal confirmation before state-changing actions)
- `ConfirmModal`
- `TransactionLogger` (pending/confirmed/failed tx trail)
- `RoleGuard` (role-based page restriction)

## 7) OpenClaw Layer (What It Does)

There is no `moltbot` module in this repo. The agent layer is `OpenClaw`.

### 7.1 Runtime Bridge

File:

- `frontend/lib/server/openclaw.ts`

Responsibilities:

- Maps allowed workflow keys to fixed scripts:
  - `workflow1 -> workflow1-intelligent-drafting.js`
  - `workflow2 -> workflow2-proof-validation.js`
  - `workflow3 -> workflow3-monitoring.js`
- Restricts script and log paths to OpenClaw root.
- Passes safe environment variables.
- Executes scripts through Node child process.
- Parses and validates JSON output shape at API layer.

### 7.2 Workflow 1: Intelligent Campaign Drafting

File:

- `openclaw/workflows/workflow1-intelligent-drafting.js`

What it does:

- Parses brand request fields (`headline`, `budgetBNB`, `deliverables`, `timeline`, `brandAddr`).
- Infers influencer category (fitness/gaming/fashion/general).
- Builds deterministic milestone split.
- Suggests influencer candidates.
- Returns structured transaction proposal for `createCampaign`.
- Explicitly enforces:
  - `humanApprovalRequired: true`
  - `autoExecute: false`
- Writes audit log entry.

### 7.3 Workflow 2: Proof Validation Assistance

File:

- `openclaw/workflows/workflow2-proof-validation.js`

What it does:

- Validates proof format (`ipfs://...` or direct `https://...`).
- Flags suspicious short-link providers.
- Returns deterministic output:
  - `valid`
  - `reasoning`
  - `suggestion` (`approve` or `reject`)
  - `humanReviewComment`
- Writes audit log entry.

### 7.4 Workflow 3: On-chain Monitoring

File:

- `openclaw/workflows/workflow3-monitoring.js`

What it does:

- Queries contract events (`CampaignCreated`, `ProofSubmitted`, `MilestoneApproved`, `FundsReleased`).
- Tracks replay window from stored last processed block.
- Computes alerts:
  - pending approvals
  - pending proofs
- Produces recommendations for operator action.
- Writes event observations to audit log.
- Updates monitor state file.

## 8) API Layer for OpenClaw

Files:

- `frontend/app/api/agent/workflow1/route.ts`
- `frontend/app/api/agent/workflow2/route.ts`
- `frontend/app/api/agent/workflow3/route.ts`
- `frontend/app/api/agent-logs/route.ts`

Implemented logic:

- Request schema validation.
- Workflow execution via `runOpenClawWorkflow`.
- Response-shape checks.
- Error-safe API responses.
- Monitoring endpoint blocks execution if contract address is not configured.
- Logs endpoint serves audit records for admin dashboard.

## 9) Logging and Audit Trail

Shared helper:

- `openclaw/workflows/_shared.js`

Files produced:

- `openclaw/logs/agent-audit.log`
  - JSON lines with:
    - timestamp
    - workflow
    - userId
    - chainEventHash
    - recommendation
- `openclaw/logs/monitor-state.json`
  - stores `lastProcessedBlock` for monitoring replay continuity.

## 10) Environment Variables and Config

Root `.env.example` includes:

- `PRIVATE_KEY`
- `BSC_TESTNET_RPC_URL`
- `BSC_MAINNET_RPC_URL`
- `ETHERSCAN_API_KEY`
- `AGENCY_TREASURY`
- `CONTRACT_ADDRESS_TESTNET`
- `CONTRACT_ADDRESS_MAINNET`

Frontend `.env.local.example` includes:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_USE_TESTNET`
- `NEXT_PUBLIC_BSC_TESTNET_RPC_URL`
- `NEXT_PUBLIC_BSC_MAINNET_RPC_URL`
- `NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS`
- `NEXT_PUBLIC_ADMIN_WALLET`
- `CONTRACT_ADDRESS_TESTNET`
- `OPENCLAW_ROOT`

## 11) Command Scripts Included

Root (`package.json`):

- `npm run build:contracts`
- `npm run test:contracts`
- `npm run deploy:testnet`
- `npm run deploy:mainnet`
- `npm run verify:testnet`
- `npm run verify:mainnet`
- `npm run test:agent`
- `npm run agent:workflow1`
- `npm run agent:workflow2`
- `npm run agent:workflow3`

Frontend (`frontend/package.json`):

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test:e2e`

## 12) Testing Coverage Included

### Smart Contract Tests

File:

- `test/CampaignEscrowV2.ts`

Covers:

- campaign creation
- funding
- proof submission
- milestone approvals
- payout splitting
- unauthorized operation reverts
- release-without-approval revert

### OpenClaw Mock Tests

File:

- `openclaw/tests/mock-flows.test.js`

Covers:

- workflow1 response policy and shape
- workflow2 response shape and logic

### Frontend and API Integration Tests

Files:

- `frontend/tests/smoke.spec.ts`
- `frontend/tests/api-contracts.spec.ts`
- `frontend/tests/agent-ui.spec.ts`

Covers:

- route availability
- workflow API contracts
- AI proposal apply flow
- admin monitoring trigger flow

## 13) Business Logic Summary (End-to-End)

1. Brand connects wallet and sets role.
2. Brand can optionally use OpenClaw draft proposal.
3. Brand creates campaign and deposits escrow.
4. Influencer submits proof (optionally checked by OpenClaw).
5. Brand manually approves milestone.
6. Brand manually releases funds.
7. Contract splits payout:
   - influencer amount
   - agency fee to owner treasury
8. Admin can run monitor scans and inspect audit trails.

## 14) Security Posture Included

- Human-in-the-loop enforced (no auto tx execution).
- OpenClaw outputs are advisory only.
- Role-gated UI views and explicit tx confirmations.
- Contract pause + reentrancy controls.
- Error-aware UX for common on-chain failure causes.
- Audit logs for traceability.

## 15) Known Current Limitations

- Monitoring is scan-based, not daemonized real-time service.
- Proof validation is format/heuristic based (not deep content verification).
- No proxy upgrade pattern in current contract deployment.
- Some wallet dependency warnings may appear during frontend build, but core flows remain functional.

## 16) Where to Read More

- `README.md`
- `docs/CONTRACT_EXPLAINED.md`
- `docs/ARCHITECTURE.md`
- `docs/SECURITY_SANDBOXING.md`
- `docs/TESTING.md`
- `docs/DEMO.md`

## 17) Email Integration (Latest)

New safe platform-managed email stack has been added:

- Backend routes:
  - `POST /api/email/draft`
  - `POST /api/email/send`
  - `POST /api/email/replies`
  - `GET /api/email/replies`
- OpenClaw workflows:
  - `openclaw/workflows/workflow4-email-drafting.js`
  - `openclaw/workflows/workflow5-reply-parsing.js`
- Output schemas:
  - `openclaw/schemas/email-draft-output.schema.json`
  - `openclaw/schemas/email-reply-parse-output.schema.json`

Safety guarantees implemented:

- No end-user Gmail OAuth required.
- Single platform-managed sender account.
- Moltbot advisory mode only (no send, no auto-reply, no on-chain actions).
- Backend-only Gmail access.
- Label-restricted reply reading (`GMAIL_REPLY_LABEL`).
- Human approval metadata required before send.
