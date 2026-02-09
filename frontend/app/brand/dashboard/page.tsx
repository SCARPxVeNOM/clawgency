"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAddress, parseEther } from "viem";
import toast from "react-hot-toast";
import { CampaignCard } from "@/components/CampaignCard";
import { ContractButton } from "@/components/ContractButton";
import { RoleGuard } from "@/components/RoleGuard";
import { useSession } from "@/context/SessionContext";
import { fetchAllCampaigns, subscribeCampaignEvents, type CampaignView } from "@/lib/campaigns";
import { isContractConfigured } from "@/lib/contract";
import { useContractActions } from "@/lib/useContractActions";

export default function BrandDashboardPage() {
  const { walletAddress, isConnected } = useSession();
  const actions = useContractActions();

  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [loading, setLoading] = useState(true);
  const [influencer, setInfluencer] = useState("");
  const [milestonesCsv, setMilestonesCsv] = useState("0.3,0.3,0.4");
  const [agencyFeeBps, setAgencyFeeBps] = useState("500");
  const [depositCampaignId, setDepositCampaignId] = useState("");
  const [depositAmount, setDepositAmount] = useState("1.0");

  const loadCampaigns = useCallback(async () => {
    if (!isContractConfigured || !walletAddress) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const all = await fetchAllCampaigns();
      setCampaigns(all.filter((c) => c.brand.toLowerCase() === walletAddress.toLowerCase()));
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void loadCampaigns();
    const stopWatching = subscribeCampaignEvents(() => {
      void loadCampaigns();
    });
    const interval = setInterval(() => void loadCampaigns(), 12_000);
    return () => {
      stopWatching();
      clearInterval(interval);
    };
  }, [loadCampaigns]);

  const canSubmitCreate = useMemo(() => isConnected && walletAddress && isAddress(influencer), [isConnected, walletAddress, influencer]);

  async function createCampaign() {
    if (!walletAddress || !isAddress(influencer)) {
      toast.error("Provide a valid influencer address.");
      return;
    }
    const milestones = milestonesCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseEther(s));
    if (milestones.length === 0) {
      throw new Error("Enter at least one milestone amount.");
    }

    await actions.createCampaign(walletAddress, influencer as `0x${string}`, milestones, Number(agencyFeeBps));
    await loadCampaigns();
  }

  async function deposit() {
    if (!depositCampaignId.trim()) {
      throw new Error("Enter campaign ID");
    }
    await actions.depositFunds(BigInt(depositCampaignId), depositAmount);
    await loadCampaigns();
  }

  return (
    <RoleGuard allow={["brand"]}>
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Brand Dashboard</h2>
          <p className="mt-2 text-sm text-steel">
            Review influencer proofs, approve milestones, and manually release funds when ready.
          </p>

          {!isContractConfigured && (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              Set `NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS` in `frontend/.env.local`.
            </p>
          )}
        </section>

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-ink">Create Campaign</h3>
            <input
              value={influencer}
              onChange={(e) => setInfluencer(e.target.value)}
              placeholder="Influencer wallet"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <input
              value={milestonesCsv}
              onChange={(e) => setMilestonesCsv(e.target.value)}
              placeholder="Milestones in BNB, comma-separated"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <input
              value={agencyFeeBps}
              onChange={(e) => setAgencyFeeBps(e.target.value)}
              placeholder="Agency fee in bps (e.g. 500)"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <ContractButton
              label="Create Campaign"
              confirmTitle="Create campaign on-chain?"
              confirmMessage="This creates a new campaign. Transaction must be manually confirmed in wallet."
              disabled={!canSubmitCreate}
              onExecute={createCampaign}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Deposit Campaign Funds</h3>
            <input
              value={depositCampaignId}
              onChange={(e) => setDepositCampaignId(e.target.value)}
              placeholder="Campaign ID"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <input
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount in BNB"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            <ContractButton
              label="Deposit"
              confirmTitle="Deposit escrow funds?"
              confirmMessage="This sends BNB to campaign escrow."
              disabled={!isConnected}
              onExecute={deposit}
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">Your Campaigns</h3>
          {loading && <p className="text-sm text-steel">Loading campaigns...</p>}
          {!loading && campaigns.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-steel">
              No campaigns found for this brand wallet.
            </p>
          )}
          {campaigns.map((campaign) => {
            const hasApprovedUnpaid = campaign.milestones.some((m) => m.approved && !m.paid);
            const approvableMilestones = campaign.milestones.filter((m) => !m.approved && m.proofHash);

            return (
              <CampaignCard
                key={campaign.id.toString()}
                campaign={campaign}
                actionSlot={
                  <>
                    {approvableMilestones.map((m) => (
                      <ContractButton
                        key={`approve-${campaign.id}-${m.index}`}
                        label={`Approve M${m.index.toString()}`}
                        confirmTitle="Approve milestone?"
                        confirmMessage={`Approve milestone ${m.index.toString()} for campaign #${campaign.id.toString()} after manual proof review.`}
                        onExecute={() => actions.approveMilestone(campaign.id, m.index).then(() => loadCampaigns())}
                      />
                    ))}
                    <ContractButton
                      label="Release Approved Funds"
                      confirmTitle="Release approved funds?"
                      confirmMessage="This executes on-chain payout split for approved milestones."
                      disabled={!hasApprovedUnpaid}
                      onExecute={() => actions.releaseFunds(campaign.id).then(() => loadCampaigns())}
                    />
                  </>
                }
              />
            );
          })}
        </section>
      </div>
    </RoleGuard>
  );
}
