# Clawgency — AI-Powered On-Chain Influencer Agency on BNB Chain

## Project Description
**Clawgency** is a professional-grade, autonomous **AI influencer agency** that operates entirely on-chain via **BNB Chain**. It solves the critical trust and coordination problems in influencer marketing by replacing manual contracts with **milestone-based smart contract escrows** and replacing manual operations with **deterministic AI agents**.

Unlike other "AI agents" that autonomously sign transactions (often recklessly), Clawgency implements a strict **Human-in-the-Loop (HITL)** architecture. The AI (Moltbot/OpenClaw) is purely advisory—it drafts campaigns, validates proofs, and monitors chains—but **never** executes a payout or sends an email without explicit, cryptographically-logged human approval.

## Key Features & Architecture

### 1. Smart Contract Escrow (BNB Chain)
At the core is `CampaignEscrowV2.sol`, a secure Solidity contract deployed on BNB Chain.
*   **Milestone-Based Releases:** Funds are locked in escrow and only released when specific milestones are met and verified.
*   **Agency Fee Split:** Automatically routes a configurable percentage (e.g., 5%) to the agency treasury upon every release.
*   **Reputation System:** purely on-chain tracking of successful campaign completions.
*   **Security:** Implements OpenZeppelin's `ReentrancyGuard`, `Pausable`, and `Ownable` for robust security.

### 2. OpenClaw Workflow Engine (The AI Brain)
OpenClaw is our local, deterministic AI workflow engine. It runs separate from the blockchain to ensure safety and auditability.
*   **Campaign Drafting:** Autonomously generates structured campaign proposals based on brand requirements.
*   **Proof Validation:** Analyzes submitted URL proofs (Tweets, YouTube videos) to recommend "Approve" or "Reject".
*   **Chain Monitoring:** Watches on-chain events (`FundsDeposited`, `ProofSubmitted`) to trigger real-world notifications.
*   **Advisory-Only Model:** All AI outputs are suggestions. The AI cannot sign transactions or move funds.

### 3. Platform-Managed Email Integration
A secure, backend-only Gmail integration that handles influencer communication without requiring brands to connect their own mixed-use mailboxes.
*   **Thread-Based Reply Parsing:** Intelligently fetches and classifies email replies (e.g., "Interested", "Price Negotiation", "Decline").
*   **Human Approval Gate:** A dedicated API gate prevents any email from being sent without a valid `approvalSessionId` signed by a human operator.

### 4. Role-Based Dashboards (Next.js + RainbowKit)
Three distinct views tailored to each stakeholder:
*   **Brand Dashboard:** For creating campaigns, funding escrow, and approving deliverables.
*   **Influencer Dashboard:** For viewing offers, submitting proofs, and claiming payouts.
*   **Admin Dashboard:** A "God Mode" view for the agency to oversee all operations, approve AI drafts, and manage the platform.

## How it uses BNB Chain
Clawgency utilizes BNB Chain's high throughput and low fees to make micro-milestone payments viable. Every step of the marketing lifecycle—from the initial agreement (Contract Deployment) to the final layout (Fund Release)—is recorded on BNB Chain, creating an immutable history of commercial performance for every influencer.

## Technical Stack
*   **Blockchain:** Solidity, Hardhat, BNB Smart Chain
*   **Frontend:** Next.js 14, TypeScript, Tailwind CSS, RainbowKit, wagmi, viem
*   **AI/Agent:** Custom "OpenClaw" engine (Node.js-based deterministic workflows)
*   **Integration:** Gmail API (OAuth2), Google Cloud Platform

## Safety & Security
We prioritized safety above all else.
*   **No Private Keys in AI:** The agent runtime has zero access to wallets.
*   **Append-Only Audit Logs:** Every human interaction and AI decision is logged to an immutable local ledger.
*   **Sandboxed Runtime:** AI workflows run in restricted contexts to prevent data exfiltration.

## Future Roadmap
*   **Public Registry:** Turning the `CampaignEscrow` data into a public, searchable "Credit Score" for influencers.
*   **Multi-Agent Negotiation:** Allowing Influencer AIs to negotiate terms safely with Brand AIs before human sign-off.
*   **Stablecoin Integration:** Upgrading from native BNB to USDT/USDC for stable campaign pricing.
