"use client";

import { waitForTransactionReceipt } from "@wagmi/core";
import { parseEther } from "viem";
import { useWriteContract } from "wagmi";
import { useTransactionLog } from "@/context/TransactionLogContext";
import { campaignEscrowV2Abi, campaignEscrowV2Address } from "@/lib/contract";
import { wagmiConfig } from "@/lib/wagmi";

export function useContractActions() {
  const { writeContractAsync } = useWriteContract();
  const { addLog, updateLog } = useTransactionLog();

  async function execute(functionName: string, args: readonly unknown[], actionLabel: string, value?: bigint) {
    const logId = addLog({
      action: actionLabel,
      status: "pending",
      detail: `${functionName} pending`
    });

    try {
      const hash = await writeContractAsync({
        abi: campaignEscrowV2Abi,
        address: campaignEscrowV2Address,
        functionName: functionName as any,
        args: args as any,
        ...(value ? { value } : {})
      });

      updateLog(logId, { txHash: hash, detail: "Transaction submitted" });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      updateLog(logId, { status: "confirmed", detail: "Transaction confirmed" });
      return hash;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown transaction failure";
      updateLog(logId, { status: "failed", detail: message });
      throw error;
    }
  }

  return {
    createCampaign: (brand: `0x${string}`, influencer: `0x${string}`, milestonesWei: bigint[], feeBps: number) =>
      execute("createCampaign", [brand, influencer, milestonesWei, BigInt(feeBps)], "Create Campaign"),
    depositFunds: (campaignId: bigint, amountBnb: string) =>
      execute("depositFunds", [campaignId], "Deposit Funds", parseEther(amountBnb)),
    submitProof: (campaignId: bigint, proofHash: string) =>
      execute("submitProof", [campaignId, proofHash], "Submit Proof"),
    approveMilestone: (campaignId: bigint, milestoneIndex: bigint) =>
      execute("approveMilestone", [campaignId, milestoneIndex], "Approve Milestone"),
    releaseFunds: (campaignId: bigint) => execute("releaseFunds", [campaignId], "Release Funds")
  };
}
