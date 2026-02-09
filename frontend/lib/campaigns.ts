import { readContract, watchContractEvent } from "@wagmi/core";
import { formatEther } from "viem";
import { campaignEscrowV2Abi, campaignEscrowV2Address } from "@/lib/contract";
import { wagmiConfig } from "@/lib/wagmi";

export type CampaignState = 0 | 1 | 2 | 3;

export type MilestoneView = {
  index: bigint;
  amount: bigint;
  approved: boolean;
  paid: boolean;
  proofHash: string;
};

export type CampaignView = {
  id: bigint;
  brand: `0x${string}`;
  influencer: `0x${string}`;
  totalMilestoneAmount: bigint;
  totalEscrowed: bigint;
  totalReleased: bigint;
  agencyFeeBps: number;
  reputationScore: bigint;
  state: CampaignState;
  milestones: MilestoneView[];
};

const stateMap: Record<CampaignState, string> = {
  0: "Created",
  1: "Funded",
  2: "Completed",
  3: "Cancelled"
};

export function stateLabel(state: CampaignState): string {
  return stateMap[state] ?? "Unknown";
}

export function formatBnb(value: bigint): string {
  return `${Number(formatEther(value)).toFixed(4)} BNB`;
}

export async function fetchAllCampaigns(): Promise<CampaignView[]> {
  const count = await readContract(wagmiConfig, {
    address: campaignEscrowV2Address,
    abi: campaignEscrowV2Abi,
    functionName: "campaignCount"
  });

  const campaigns: CampaignView[] = [];
  for (let id = 1n; id <= count; id++) {
    const rawCampaign = await readContract(wagmiConfig, {
      address: campaignEscrowV2Address,
      abi: campaignEscrowV2Abi,
      functionName: "getCampaign",
      args: [id]
    });

    const milestoneCount = (rawCampaign[8] as bigint) ?? 0n;
    const milestones: MilestoneView[] = [];
    for (let i = 0n; i < milestoneCount; i++) {
      const row = await readContract(wagmiConfig, {
        address: campaignEscrowV2Address,
        abi: campaignEscrowV2Abi,
        functionName: "getMilestone",
        args: [id, i]
      });

      milestones.push({
        index: i,
        amount: row[0] as bigint,
        approved: row[1] as boolean,
        paid: row[2] as boolean,
        proofHash: row[3] as string
      });
    }

    campaigns.push({
      id,
      brand: rawCampaign[0] as `0x${string}`,
      influencer: rawCampaign[1] as `0x${string}`,
      totalMilestoneAmount: rawCampaign[2] as bigint,
      totalEscrowed: rawCampaign[3] as bigint,
      totalReleased: rawCampaign[4] as bigint,
      agencyFeeBps: Number(rawCampaign[5]),
      reputationScore: rawCampaign[6] as bigint,
      state: Number(rawCampaign[7]) as CampaignState,
      milestones
    });
  }

  return campaigns;
}

export function subscribeCampaignEvents(onEvent: () => void): () => void {
  return watchContractEvent(wagmiConfig, {
    address: campaignEscrowV2Address,
    abi: campaignEscrowV2Abi,
    onLogs() {
      onEvent();
    }
  });
}
