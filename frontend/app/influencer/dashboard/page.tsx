"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CampaignCard } from "@/components/CampaignCard";
import { ProofUploader } from "@/components/ProofUploader";
import { RoleGuard } from "@/components/RoleGuard";
import { useSession } from "@/context/SessionContext";
import { fetchAllCampaigns, subscribeCampaignEvents, type CampaignView } from "@/lib/campaigns";
import { isContractConfigured } from "@/lib/contract";
import { useContractActions } from "@/lib/useContractActions";
import type { Workflow2Response } from "@/types/agent";

export default function InfluencerDashboardPage() {
  const { walletAddress } = useSession();
  const actions = useContractActions();
  const [campaigns, setCampaigns] = useState<CampaignView[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCampaigns = useCallback(async () => {
    if (!walletAddress || !isContractConfigured) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const all = await fetchAllCampaigns();
      setCampaigns(all.filter((c) => c.influencer.toLowerCase() === walletAddress.toLowerCase()));
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void loadCampaigns();
    const stop = subscribeCampaignEvents(() => void loadCampaigns());
    const interval = setInterval(() => void loadCampaigns(), 12_000);
    return () => {
      stop();
      clearInterval(interval);
    };
  }, [loadCampaigns]);

  async function validateProof(campaignId: bigint, proofHash: string): Promise<Workflow2Response> {
    const response = await fetch("/api/agent/workflow2", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campaignId: campaignId.toString(),
        proofHash,
        userId: walletAddress ?? "unknown_influencer",
        chainEventHash: "N/A"
      })
    });

    const payload = (await response.json()) as Workflow2Response | { error?: string };
    if (!response.ok) {
      throw new Error(payload && "error" in payload ? payload.error ?? "Proof validation failed." : "Proof validation failed.");
    }

    toast.success("AI proof validation completed.");
    return payload as Workflow2Response;
  }

  const campaignsNeedingProof = campaigns.filter((campaign) =>
    campaign.milestones.some((m) => !m.paid && !m.proofHash)
  ).length;
  const campaignsWaitingApproval = campaigns.filter((campaign) =>
    campaign.milestones.some((m) => !m.paid && m.proofHash && !m.approved)
  ).length;

  return (
    <RoleGuard allow={["influencer"]}>
      <div className="space-y-5">
        <section className="section-card reveal-up p-5">
          <h2 className="card-title">Influencer Dashboard</h2>
          <p className="card-subtitle">
            Submit proof hashes, track milestone approvals, and monitor on-chain releases.
          </p>
          <div className="mt-3 grid gap-2 text-xs text-steel md:grid-cols-3">
            <p className="rounded-lg border border-slate-200 bg-white/75 px-3 py-2">1. Pick an assigned campaign</p>
            <p className="rounded-lg border border-slate-200 bg-white/75 px-3 py-2">2. Validate and submit proof</p>
            <p className="rounded-lg border border-slate-200 bg-white/75 px-3 py-2">3. Wait for brand approval + release</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="metric-card">
              <p className="metric-label">Assigned</p>
              <p className="metric-value">{campaigns.length}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Need Proof</p>
              <p className="metric-value">{campaignsNeedingProof}</p>
            </div>
            <div className="metric-card">
              <p className="metric-label">Awaiting Brand</p>
              <p className="metric-value">{campaignsWaitingApproval}</p>
            </div>
          </div>
          {!isContractConfigured && (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              Set `NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS` in `frontend/.env.local`.
            </p>
          )}
        </section>

        <section className="space-y-4 reveal-up reveal-delay-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">Assigned Campaigns</h3>
          {loading && <p className="text-sm text-steel">Loading campaigns...</p>}
          {!loading && campaigns.length === 0 && (
            <p className="section-card p-4 text-sm text-steel">No campaigns are assigned to this influencer wallet.</p>
          )}

          {campaigns.map((campaign) => {
            const nextProofNeeded = campaign.milestones.some((m) => !m.paid && !m.proofHash);

            return (
              <CampaignCard
                key={campaign.id.toString()}
                campaign={campaign}
                actionSlot={
                  <div className="w-full">
                    {nextProofNeeded ? (
                      <ProofUploader
                        onValidate={(proofHash) => validateProof(campaign.id, proofHash)}
                        onSubmit={async (proofHash) => {
                          await actions.submitProof(campaign.id, proofHash);
                          toast.success("Proof submitted for next milestone.");
                          await loadCampaigns();
                        }}
                      />
                    ) : (
                      <p className="rounded-lg border border-slate-200 bg-white/70 p-3 text-xs text-steel">
                        No pending proof submission right now.
                      </p>
                    )}
                  </div>
                }
              />
            );
          })}
        </section>
      </div>
    </RoleGuard>
  );
}
