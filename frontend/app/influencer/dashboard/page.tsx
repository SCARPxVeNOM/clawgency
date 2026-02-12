"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Clock, AlertCircle, CheckCircle, Sparkles, FileCheck, Upload, Zap } from "lucide-react";
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
      <div className="space-y-8 max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
              <Sparkles size={18} className="text-violet-500" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-gray-900">Creator Hub</h1>
              <p className="text-xs font-body font-medium text-gray-400">Submit proofs & track milestones</p>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <section className="grid grid-cols-3 gap-4">
          {[
            {
              icon: <Clock size={15} strokeWidth={2.5} />,
              label: "Active Gigs",
              value: campaigns.length,
              color: "#6366f1",
              bg: "rgba(99,102,241,0.08)",
            },
            {
              icon: <AlertCircle size={15} strokeWidth={2.5} />,
              label: "Needs Proof",
              value: campaignsNeedingProof,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.08)",
            },
            {
              icon: <CheckCircle size={15} strokeWidth={2.5} />,
              label: "Pending",
              value: campaignsWaitingApproval,
              color: "#10b981",
              bg: "rgba(16,185,129,0.08)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card rounded-2xl p-5 space-y-3 hover:shadow-glass-hover transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: stat.bg, color: stat.color }}
                >
                  {stat.icon}
                </div>
                <p className="text-[10px] font-body font-bold uppercase tracking-[0.15em] text-gray-400">
                  {stat.label}
                </p>
              </div>
              <p className="text-3xl font-heading font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </section>

        {/* ── My Tasks ── */}
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
              <FileCheck size={13} className="text-indigo-500" />
            </div>
            <h2 className="text-sm font-heading font-bold text-gray-900 uppercase tracking-wide">My Tasks</h2>
          </div>

          {loading ? (
            <div className="glass-card rounded-2xl flex justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs font-body text-gray-400">Loading campaigns...</p>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="glass-card rounded-2xl text-center py-16 px-6">
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(139,92,246,0.08)" }}>
                <Zap size={22} className="text-violet-400" />
              </div>
              <p className="text-base font-heading font-bold text-gray-700">No active campaigns</p>
              <p className="text-sm font-body text-gray-400 mt-1 max-w-xs mx-auto">
                When a brand assigns you a campaign, your tasks and milestones will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {campaigns.map((c) => (
                <div key={c.id.toString()} className="space-y-3">
                  {/* Campaign Card */}
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <CampaignCard campaign={c} />
                  </div>

                  {/* Proof Uploader */}
                  <div className="ml-5 pl-5 border-l-2 border-indigo-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(99,102,241,0.08)" }}>
                        <Upload size={11} className="text-indigo-500" />
                      </div>
                      <p className="text-[10px] font-body font-bold uppercase tracking-[0.15em] text-gray-400">
                        Submit Proof
                      </p>
                    </div>
                    <div className="glass-card rounded-xl p-4">
                      <ProofUploader
                        onSubmit={async (hash) => {
                          await actions.submitProof(c.id, hash);
                          toast.success("Proof submitted on-chain!");
                        }}
                        onValidate={(hash) => validateProof(c.id, hash)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </RoleGuard>
  );
}
