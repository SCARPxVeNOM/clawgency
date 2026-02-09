# Architecture

## System Overview

Clawgency Slot 2 is organized into four cooperating layers:

1. Smart contract layer (`CampaignEscrowV2`) on BNB Chain.
2. Frontend layer (Next.js + wagmi/RainbowKit).
3. OpenClaw agent orchestration layer (local scripts).
4. Logging/audit layer for agent and operator actions.

## Diagram

```mermaid
flowchart LR
  A[Brand Wallet] -->|create/approve/release| C[CampaignEscrowV2]
  B[Influencer Wallet] -->|submitProof| C
  C -->|events/state| D[Next.js Dashboards]
  C -->|events/query| E[OpenClaw Monitoring]
  F[OpenClaw Drafting] -->|proposal JSON| G[Human Reviewer]
  H[OpenClaw Proof Validation] -->|approve/reject suggestion| G
  G -->|manual tx confirmation| D
  E -->|alerts + recommendations| I[Admin Analytics]
  E --> J[agent-audit.log]
  F --> J
  H --> J
```

## Key Data Flows

- `Brand -> Contract`: campaign creation, deposit, milestone approvals, release.
- `Influencer -> Contract`: proof submissions.
- `Contract -> Frontend`: campaign/milestone reads, event-driven refresh.
- `OpenClaw -> Human`: structured suggestions only, never direct transaction execution.
- `OpenClaw -> Logs`: JSON line audit records with timestamps and event hash references.

## Human-in-the-Loop Guarantees

- Brand must manually approve milestones on-chain.
- Release calls are manual wallet actions through UI confirmations.
- OpenClaw scripts produce suggestions only (`autoExecute=false` in proposals).
