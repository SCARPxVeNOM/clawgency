# Architecture

## System Overview

Clawgency Slot 2 is organized into four cooperating layers:

1. Smart contract layer (`CampaignEscrowV2`) on BNB Chain.
2. Frontend layer (Next.js + wagmi/RainbowKit).
3. OpenClaw agent orchestration layer (local scripts).
4. Logging/audit layer for agent and operator actions.
5. Platform-managed Gmail backend integration (no end-user OAuth).

## Diagram

```mermaid
flowchart LR
  A[Brand Wallet] -->|create/approve/release| C[CampaignEscrowV2]
  B[Influencer Wallet] -->|submitProof| C
  C -->|events/state| D[Next.js Dashboards]
  C -->|events/query| E[OpenClaw Monitoring]
  F[OpenClaw Drafting] -->|proposal JSON| G[Human Reviewer]
  H[OpenClaw Proof Validation] -->|approve/reject suggestion| G
  K[OpenClaw Email Drafting] -->|draft JSON| G
  L[OpenClaw Reply Parsing] -->|interest JSON| G
  M[Backend Gmail Adapter] -->|send/read labelled replies| N[Platform Gmail Account]
  G -->|manual tx confirmation| D
  E -->|alerts + recommendations| I[Admin Analytics]
  E --> J[agent-audit.log]
  F --> J
  H --> J
  K --> J
  L --> J
```

## Key Data Flows

- `Brand -> Contract`: campaign creation, deposit, milestone approvals, release.
- `Influencer -> Contract`: proof submissions.
- `Contract -> Frontend`: campaign/milestone reads, event-driven refresh.
- `OpenClaw -> Human`: structured suggestions only, never direct transaction execution.
- `OpenClaw -> Logs`: JSON line audit records with timestamps and event hash references.
- `Backend -> Gmail`: platform mailbox send/read only.
- `Gmail replies -> OpenClaw`: parse into deterministic intent JSON for dashboard display.

## Human-in-the-Loop Guarantees

- Brand must manually approve milestones on-chain.
- Release calls are manual wallet actions through UI confirmations.
- OpenClaw scripts produce suggestions only (`autoExecute=false` in proposals).
- Email sends are backend-controlled and require human approval metadata.
