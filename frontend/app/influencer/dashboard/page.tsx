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

  return (
    <RoleGuard allow={["influencer"]}>
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Influencer Dashboard</h2>
          <p className="mt-2 text-sm text-steel">
            Submit proof hashes, track milestone approvals, and monitor on-chain releases.
          </p>
          {!isContractConfigured && (
            <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
              Set `NEXT_PUBLIC_CAMPAIGN_ESCROW_V2_ADDRESS` in `frontend/.env.local`.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">Assigned Campaigns</h3>
          {loading && <p className="text-sm text-steel">Loading campaigns...</p>}
          {!loading && campaigns.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-steel">
              No campaigns are assigned to this influencer wallet.
            </p>
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
                        onSubmit={async (proofHash) => {
                          await actions.submitProof(campaign.id, proofHash);
                          toast.success("Proof submitted for next milestone.");
                          await loadCampaigns();
                        }}
                      />
                    ) : (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-steel">
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
