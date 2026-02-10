"use client";

import { waitForTransactionReceipt } from "@wagmi/core";
import { parseEther } from "viem";
import { useWriteContract } from "wagmi";
import { useTransactionLog } from "@/context/TransactionLogContext";
import { campaignEscrowV2Abi, campaignEscrowV2Address } from "@/lib/contract";
import { wagmiConfig } from "@/lib/wagmi";

const selectorMessageMap: Record<string, string> = {
  "0x2c067cd7": "Campaign was not found. Pick an existing campaign from your dashboard list.",
  "0xe6c4247b": "Address is invalid. Check brand and influencer wallet inputs.",
  "0x58836618": "Agency fee is too high. Use 0 to 3000 basis points.",
  "0xcc40d0a9": "Milestone configuration is invalid. Ensure every milestone amount is greater than zero.",
  "0x82b42900": "Connected wallet is not authorized for this action.",
  "0xfdf4d873": "Milestone index is invalid for this campaign.",
  "0xd2fee4b1": "Proof hash cannot be empty.",
  "0x26b16294": "No proof found for this milestone yet. Review proof submission first.",
  "0x535ed390": "Milestone is already approved.",
  "0xb10205ed": "No releasable funds. Approve a milestone and ensure escrow is funded.",
  "0x90b8ec18": "Transfer failed during payout. Try again and confirm recipient wallets."
};

function friendlyErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    if (/user rejected|denied transaction signature|request rejected/i.test(message)) {
      return "Transaction was cancelled in wallet.";
    }

    const selectorMatch = message.match(/0x[a-fA-F0-9]{8}/);
    if (selectorMatch) {
      const selector = selectorMatch[0].toLowerCase();
      if (selectorMessageMap[selector]) {
        return selectorMessageMap[selector];
      }
    }

    if (/insufficient funds/i.test(message)) {
      return "Insufficient wallet balance for this transaction.";
    }

    return message.length > 220 ? `${message.slice(0, 217)}...` : message;
  }

  return "Unknown transaction failure";
}

export function useContractActions() {
  const { writeContractAsync } = useWriteContract();
  const { addLog, updateLog } = useTransactionLog();

  type ContractFunctionName =
    | "createCampaign"
    | "depositFunds"
    | "submitProof"
    | "approveMilestone"
    | "releaseFunds";

  async function execute(functionName: ContractFunctionName, args: readonly unknown[], actionLabel: string, value?: bigint) {
    const logId = addLog({
      action: actionLabel,
      status: "pending",
      detail: `${functionName} pending`
    });

    try {
      const hash = await writeContractAsync({
        abi: campaignEscrowV2Abi,
        address: campaignEscrowV2Address,
        functionName,
        args: args as never,
        ...(value ? { value } : {})
      });

      updateLog(logId, { txHash: hash, detail: "Transaction submitted" });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      updateLog(logId, { status: "confirmed", detail: "Transaction confirmed" });
      return hash;
    } catch (error) {
      const message = friendlyErrorMessage(error);
      updateLog(logId, { status: "failed", detail: message });
      throw new Error(message);
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
