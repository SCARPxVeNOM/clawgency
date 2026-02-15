import type { Workflow3Request, Workflow3Response } from "@/types/agent";
import { appendAgentAuditLog } from "@/lib/server/agent-audit";
import { createPublicClient, http, parseAbiItem } from "viem";

const DEFAULT_TESTNET_RPC_URL = "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
const DEFAULT_MAINNET_RPC_URL = "https://bsc-dataseed.binance.org";

function isTestnetMode(): boolean {
  return (process.env.NEXT_PUBLIC_USE_TESTNET ?? "true").toLowerCase() === "true";
}

function resolveRpcUrl(): string {
  if (isTestnetMode()) {
    return (
      process.env.BSC_TESTNET_RPC_URL ??
      process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ??
      DEFAULT_TESTNET_RPC_URL
    ).trim();
  }

  return (
    process.env.BSC_MAINNET_RPC_URL ??
    process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL ??
    DEFAULT_MAINNET_RPC_URL
  ).trim();
}

function resolveContractAddress(): `0x${string}` {
  const configured = (
    isTestnetMode()
      ? process.env.CONTRACT_ADDRESS_TESTNET
      : process.env.CONTRACT_ADDRESS_MAINNET
  )?.trim();
  const fallbackAddress = process.env.NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS?.trim();
  const resolved = configured || fallbackAddress || "";

  if (!resolved) {
    const requiredVar = isTestnetMode() ? "CONTRACT_ADDRESS_TESTNET" : "CONTRACT_ADDRESS_MAINNET";
    throw new Error(`Set ${requiredVar} in environment.`);
  }

  if (!configured) {
    return resolved as `0x${string}`;
  }
  return configured as `0x${string}`;
}

const EVENT_DEFS = {
  CampaignCreated: parseAbiItem(
    "event CampaignCreated(uint256 indexed campaignId,address indexed brand,address indexed influencer,uint256 totalMilestoneAmount,uint16 agencyFeeBps)"
  ),
  ProofSubmitted: parseAbiItem(
    "event ProofSubmitted(uint256 indexed campaignId,uint256 indexed milestoneIndex,address indexed influencer,string proofHash)"
  ),
  MilestoneApproved: parseAbiItem(
    "event MilestoneApproved(uint256 indexed campaignId,uint256 indexed milestoneIndex,address brand)"
  ),
  FundsReleased: parseAbiItem(
    "event FundsReleased(uint256 indexed campaignId,uint256 grossAmount,uint256 influencerAmount,uint256 agencyFeeAmount)"
  )
} as const;

function normalizeFromBlock(input: Workflow3Request, latestBlock: bigint): bigint {
  const requestedFromBlock = Number((input as { fromBlockOverride?: unknown }).fromBlockOverride);
  const canUseOverride = Number.isInteger(requestedFromBlock) && requestedFromBlock >= 0;
  if (canUseOverride) {
    const override = BigInt(requestedFromBlock);
    return override > latestBlock ? latestBlock : override;
  }

  const defaultFrom = latestBlock > 50n ? latestBlock - 50n : 0n;
  return defaultFrom;
}

export async function runWorkflow3(input: Workflow3Request): Promise<Workflow3Response> {
  const rpcUrl = resolveRpcUrl();
  const contractAddress = resolveContractAddress();

  const client = createPublicClient({
    transport: http(rpcUrl)
  });

  const latestBlock = await client.getBlockNumber();

  let fromBlock = normalizeFromBlock(input, latestBlock);
  const maxWindow = 2000n;
  if (latestBlock > maxWindow && fromBlock < latestBlock - maxWindow) {
    fromBlock = latestBlock - maxWindow;
  }

  const observedEvents: Workflow3Response["observedEvents"] = [];

  const logsByEvent = await Promise.all(
    (Object.keys(EVENT_DEFS) as Array<keyof typeof EVENT_DEFS>).map(async (eventName) => {
      try {
        const logs = await client.getLogs({
          address: contractAddress,
          event: EVENT_DEFS[eventName],
          fromBlock,
          toBlock: latestBlock
        });
        return { eventName, logs };
      } catch {
        return { eventName, logs: [] as Array<{ args?: unknown; blockNumber: bigint; transactionHash: `0x${string}` }> };
      }
    })
  );

  for (const { eventName, logs } of logsByEvent) {
    for (const log of logs) {
      const args = (log as { args?: Record<string, unknown> }).args ?? {};
      const actor = String((args.brand ?? args.influencer ?? "0x0000000000000000000000000000000000000000") as unknown).toLowerCase();
      const campaignId = Number((args.campaignId as bigint | number | undefined) ?? 0);

      observedEvents.push({
        eventName: String(eventName),
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash,
        campaignId,
        userId: actor || "unknown_user"
      });
    }
  }

  await appendAgentAuditLog({
    timestamp: new Date().toISOString(),
    workflow: "workflow3-monitoring",
    userId: "system_monitor",
    chainEventHash: "N/A",
    recommendation: `Monitoring scan queried blocks ${fromBlock}..${latestBlock} and observed ${observedEvents.length} event(s).`
  });

  return {
    monitoringWindow: { fromBlock: Number(fromBlock), toBlock: Number(latestBlock) },
    observedEvents,
    alerts: [],
    recommendations: []
  };
}
