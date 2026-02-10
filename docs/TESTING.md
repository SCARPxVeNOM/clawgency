# Testing Strategy

## 1) Smart Contract Tests (Hardhat)

File: `test/CampaignEscrowV2.ts`

Coverage:

- campaign creation
- deposit funding
- proof submission
- milestone approvals
- payout split (influencer + agency fee)
- unauthorized access checks
- release failure when nothing is approved

Run:

```bash
npm run test:contracts
```

## 2) Agent Flow Mock Tests

File: `openclaw/tests/mock-flows.test.js`

Coverage:

- Workflow 1 output structure and non-execution policy
- Workflow 2 validation output correctness

Run:

```bash
npm run test:agent
```

## 3) Frontend Integration Smoke Tests (Playwright)

Files:

- `frontend/playwright.config.ts`
- `frontend/tests/smoke.spec.ts`
- `frontend/tests/api-contracts.spec.ts`
- `frontend/tests/agent-ui.spec.ts`

Coverage:

- `/login` loads and displays wallet login heading
- `/brand/dashboard` route is reachable
- API route contracts for OpenClaw workflows (`/api/agent/workflow1`, `/api/agent/workflow2`, `/api/agent/workflow3`)
- API route contracts for email workflows (`/api/email/draft`, `/api/email/send`, `/api/email/replies`)
- Human approval gate validation on email send (`humanApprovalConfirmed` required)
- Rate-limit behavior validation for email routes (`429` + `Retry-After`)
- Approval log signature validation checks (`signatureValid` true)
- UI integration for AI proposal apply flow on brand dashboard
- UI integration for admin monitoring trigger flow

Run:

```bash
cd frontend
npm run test:e2e
```

## Edge Cases to Add Next

- partial top-up deposits before full funding
- repeated proof submissions for same milestone
- paused contract behavior in UI
- multi-campaign concurrent brand operations
- monitoring script handling deep reorgs
