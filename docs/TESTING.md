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

Coverage:

- `/login` loads and displays wallet login heading
- `/brand/dashboard` route is reachable

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
