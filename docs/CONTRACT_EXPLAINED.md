# CampaignEscrowV2 Explained

This document explains `contracts/CampaignEscrowV2.sol` in practical terms.

## Purpose

`CampaignEscrowV2` is a milestone-based escrow contract for brand-influencer collaborations.

It enforces:

- Brand-funded escrow.
- Influencer proof submission per milestone.
- Brand approval before payout.
- Fee split to agency treasury.
- Human-controlled release flow.

## Key Inheritance

The contract inherits:

- `Ownable`:
  - owner receives agency fees.
  - owner can pause/unpause.
- `ReentrancyGuard`:
  - protects release path.
- `Pausable`:
  - emergency stop for mutable operations.

## Core Constants

- `BASIS_POINTS = 10_000`:
  - standard denominator for percentages.
- `MAX_AGENCY_FEE_BPS = 3_000`:
  - agency fee cap at 30%.

## Campaign Model

Each campaign stores:

- participants:
  - `brand`
  - `influencer`
- economics:
  - `totalMilestoneAmount`
  - `totalEscrowed`
  - `totalReleased`
  - `agencyFeeBps`
- performance:
  - `reputationScore`
- state:
  - `Created`
  - `Funded`
  - `Completed`
  - `Cancelled`
- milestone arrays:
  - `milestoneAmounts`
  - `milestoneApproved`
  - `milestonePaid`
  - `milestoneProofHashes`

## Function Walkthrough

## `createCampaign(brand, influencer, milestones, agencyFee)`

What it does:

- validates addresses, fee cap, milestone structure.
- computes total budget from milestone array.
- initializes campaign with all milestone tracking arrays.

Why it matters:

- creates deterministic payout schedule.
- prevents invalid campaigns with zero values.

## `depositFunds(campaignId)` (payable)

What it does:

- only campaign brand can deposit.
- updates `totalEscrowed`.
- moves state to `Funded` once enough escrow is present.

Why it matters:

- supports pre-funding and top-ups.
- preserves state consistency with budget target.

## `submitProof(campaignId, proofHash)`

What it does:

- only influencer can submit.
- picks the next unpaid milestone lacking proof.
- stores proof hash and emits event.

Why it matters:

- keeps submission order predictable.
- anchors off-chain evidence on-chain.

## `approveMilestone(campaignId, milestoneIndex)`

What it does:

- only brand can approve.
- requires proof to exist first.
- blocks duplicate approval.

Why it matters:

- enforces human review checkpoint.
- prevents accidental double approvals.

## `releaseFunds(campaignId)`

What it does:

- only brand can release.
- aggregates approved, unpaid milestone amounts.
- marks milestones as paid before transfer.
- computes:
  - `agencyFeeAmount = gross * agencyFeeBps / BASIS_POINTS`
  - `influencerAmount = gross - agencyFeeAmount`
- transfers fee to owner and payout to influencer.
- updates campaign completion and influencer reputation.

Why it matters:

- applies checks-effects-interactions style.
- guarantees business split logic in one trusted path.

## `getCampaign(campaignId)` and `getMilestone(campaignId, milestoneIndex)`

What they do:

- expose read-friendly structured data for frontend dashboards and analytics.

Why they matter:

- avoids direct array/mapping complexity in UI.
- supports role-specific views without off-chain indexing dependency.

## `pause()` / `unpause()`

What they do:

- owner can freeze/unfreeze mutable actions during incidents.

Why they matter:

- operational safety control for production environments.

## State Lifecycle

Typical flow:

1. Brand creates campaign.
2. Brand deposits escrow.
3. Influencer submits proof for next milestone.
4. Brand approves milestone.
5. Brand releases approved funds.
6. Repeat until all milestones paid.
7. Campaign becomes `Completed` and influencer reputation increments.

## Events and Observability

Emitted events:

- `CampaignCreated`
- `FundsDeposited`
- `ProofSubmitted`
- `MilestoneApproved`
- `FundsReleased`

These power:

- frontend live updates
- analytics dashboards
- OpenClaw monitoring alerts

## Security Advantages

- role checks per campaign (`brand` vs `influencer`).
- fee cap guard to avoid abusive fee settings.
- reentrancy protection on payout path.
- pause control for emergency response.
- strong input validation and custom errors.

## Current Tradeoffs

- no dispute/arbitration window built in.
- no per-milestone due dates/slashing logic.
- no upgrade proxy (new deployments required for contract evolution).

## Suggested Next Improvements

1. Add explicit cancel/refund rules.
2. Add milestone deadlines and automatic expiry handling.
3. Add role-based access control for multi-admin agencies.
4. Add optional stablecoin payout support.
