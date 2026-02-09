# Demo Runbook

## Goal

Demonstrate professional Slot 2 flow with manual approval checkpoints.

## Prerequisites

- funded BNB testnet wallets for:
  - brand
  - influencer
  - admin
- deployed `CampaignEscrowV2` address
- frontend configured with contract address

## Demo Steps

1. Open `/login`, connect brand wallet, set role to Brand.
2. In `/brand/dashboard`, create a campaign:
   - influencer address
   - milestone schedule
   - agency fee bps
3. Deposit campaign funds from brand wallet.
4. Switch to influencer wallet, role Influencer.
5. In `/influencer/dashboard`, submit proof hash.
6. Switch back to brand wallet and approve the milestone.
7. Brand triggers `Release Approved Funds`.
8. Open `/admin/analytics` to show:
   - pending proof/approval metrics
   - OpenClaw log records with timestamps/event hashes
9. Run workflow scripts locally and show structured outputs:
   - `workflow1-intelligent-drafting.js`
   - `workflow2-proof-validation.js`
   - `workflow3-monitoring.js`

## Talking Points

- AI proposes, humans approve.
- All value-moving actions require wallet confirmation.
- Audit trail ties recommendations to chain events and mapped user IDs.
