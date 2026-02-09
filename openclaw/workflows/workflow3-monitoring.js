#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
const { readJsonFile, statePath, writeJsonFile, writeAuditLog, readUserMap } = require("./_shared");

const ABI = [
  "event CampaignCreated(uint256 indexed campaignId,address indexed brand,address indexed influencer,uint256 totalMilestoneAmount,uint16 agencyFeeBps)",
  "event ProofSubmitted(uint256 indexed campaignId,uint256 indexed milestoneIndex,address indexed influencer,string proofHash)",
  "event MilestoneApproved(uint256 indexed campaignId,uint256 indexed milestoneIndex,address brand)",
  "event FundsReleased(uint256 indexed campaignId,uint256 grossAmount,uint256 influencerAmount,uint256 agencyFeeAmount)",
  "function campaignCount() view returns (uint256)",
  "function getCampaign(uint256 campaignId) view returns (address brand,address influencer,uint256 totalMilestoneAmount,uint256 totalEscrowed,uint256 totalReleased,uint16 agencyFeeBps,uint256 reputationScore,uint8 state,uint256 milestoneCount)",
  "function getMilestone(uint256 campaignId,uint256 milestoneIndex) view returns (uint256 amount,bool approved,bool paid,string proofHash)"
];

function env(name, fallback = "") {
  return process.env[name] ?? fallback;
}

async function main() {
  const rpc = env("BSC_TESTNET_RPC_URL", "https://data-seed-prebsc-1-s1.bnbchain.org:8545");
  const contractAddress = env("CONTRACT_ADDRESS_TESTNET");
  if (!contractAddress) {
    throw new Error("Set CONTRACT_ADDRESS_TESTNET in environment.");
  }

  const provider = new ethers.JsonRpcProvider(rpc);
  const contract = new ethers.Contract(contractAddress, ABI, provider);
  const latestBlock = await provider.getBlockNumber();
  const state = readJsonFile(statePath(), { lastProcessedBlock: latestBlock - 50 });
  const fromBlock = Math.max(0, Number(state.lastProcessedBlock ?? latestBlock - 50));
  const userMap = readUserMap();

  const events = [];
  const filters = [
    contract.filters.CampaignCreated(),
    contract.filters.ProofSubmitted(),
    contract.filters.MilestoneApproved(),
    contract.filters.FundsReleased()
  ];

  for (const filter of filters) {
    const logs = await contract.queryFilter(filter, fromBlock, latestBlock);
    for (const log of logs) {
      const eventName = log.fragment?.name ?? "UnknownEvent";
      const hash = log.transactionHash;
      const actor =
        (log.args?.brand || log.args?.influencer || "0x0000000000000000000000000000000000000000").toLowerCase();
      const userId = userMap[actor] ?? "unknown_user";
      const entry = {
        eventName,
        blockNumber: log.blockNumber,
        transactionHash: hash,
        campaignId: Number(log.args?.campaignId ?? 0),
        userId
      };
      events.push(entry);
      writeAuditLog({
        workflow: "workflow3-monitoring",
        userId,
        chainEventHash: hash,
        recommendation: `Observed ${eventName} on campaign ${entry.campaignId}.`
      });
    }
  }

  const campaignCount = Number(await contract.campaignCount());
  const alerts = [];
  for (let id = 1; id <= campaignCount; id++) {
    const campaign = await contract.getCampaign(id);
    const milestoneCount = Number(campaign.milestoneCount);
    let pendingProofs = 0;
    let pendingApprovals = 0;
    for (let m = 0; m < milestoneCount; m++) {
      const milestone = await contract.getMilestone(id, m);
      if (!milestone.paid && milestone.proofHash.length === 0) pendingProofs++;
      if (!milestone.paid && milestone.proofHash.length > 0 && !milestone.approved) pendingApprovals++;
    }

    if (pendingApprovals > 0) {
      alerts.push({
        type: "pending_approval",
        campaignId: id,
        severity: "medium",
        message: `${pendingApprovals} milestone(s) have proof submitted but are awaiting brand approval.`
      });
    }
    if (pendingProofs > 0 && Number(campaign.state) === 1) {
      alerts.push({
        type: "pending_proof",
        campaignId: id,
        severity: "low",
        message: `${pendingProofs} funded milestone(s) still missing proof submissions.`
      });
    }
  }

  const recommendations = alerts.map((alert) => {
    if (alert.type === "pending_approval") {
      return {
        campaignId: alert.campaignId,
        recommendation: "Brand reviewer should audit latest proof and approve/reject milestone."
      };
    }
    return {
      campaignId: alert.campaignId,
      recommendation: "Influencer should submit proof hash for next unpaid milestone."
    };
  });

  writeJsonFile(statePath(), { lastProcessedBlock: latestBlock });

  const output = {
    monitoringWindow: { fromBlock, toBlock: latestBlock },
    observedEvents: events,
    alerts,
    recommendations
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
