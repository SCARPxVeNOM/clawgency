"use client";

import { useEffect } from "react";
import { BnbValue } from "@/components/BnbValue";
import { CampaignView, formatBnb, stateLabel } from "@/lib/campaigns";
import { useSession } from "@/context/SessionContext";
import type { RegisteredProfile } from "@/lib/profile-types";
import { Building2, CheckCircle2, Clock, Coins, ExternalLink, TrendingUp, User, Wallet, XCircle } from "lucide-react";

function shortAddr(v: string) {
  return `${v.slice(0, 6)}...${v.slice(-4)}`;
}

function shortProof(v: string) {
  if (v.length <= 44) {
    return v;
  }

  return `${v.slice(0, 26)}...${v.slice(-14)}`;
}

function proofHref(proofHash: string): string | null {
  const trimmed = proofHash.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("ipfs://")) {
    const rawPath = trimmed.slice("ipfs://".length).replace(/^ipfs\//, "").trim();
    if (!rawPath) {
      return null;
    }
    return `https://ipfs.io/ipfs/${rawPath}`;
  }

  return null;
}

type CampaignCardProps = {
  campaign: CampaignView;
  actionSlot?: React.ReactNode;
};

const stateConfig: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  Created: { color: "#6366f1", bg: "rgba(99,102,241,0.1)", icon: Clock, label: "Created" },
  Funded: { color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: Wallet, label: "Funded" },
  Completed: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", icon: CheckCircle2, label: "Completed" },
  Cancelled: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: XCircle, label: "Cancelled" }
};

function PartyCard({
  title,
  icon: Icon,
  address,
  profile
}: {
  title: string;
  icon: React.ElementType;
  address: string;
  profile: RegisteredProfile | null;
}) {
  return (
    <div className="border border-gray-100 rounded-2xl p-4 bg-white/50">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} strokeWidth={2} className="text-gray-400" />
        <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">{title}</p>
      </div>

      <p className="text-sm font-mono font-bold text-gray-900">{shortAddr(address)}</p>

      {profile ? (
        <div className="mt-2.5 space-y-1.5">
          <p className="text-xs font-heading font-bold text-gray-800">{profile.displayName}</p>
          <p className="text-[11px] text-gray-500 break-all">{profile.email}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">IG {profile.instagram}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">TG {profile.telegram}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">X {profile.x}</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-gray-400">No registered profile yet.</p>
      )}
    </div>
  );
}

export function CampaignCard({ campaign, actionSlot }: CampaignCardProps) {
  const state = stateLabel(campaign.state);
  const config = stateConfig[state] || stateConfig.Created;
  const StateIcon = config.icon;
  const { getProfileByWallet, ensureProfiles } = useSession();

  useEffect(() => {
    void ensureProfiles([campaign.brand, campaign.influencer]);
  }, [campaign.brand, campaign.influencer, ensureProfiles]);

  const brandProfile = getProfileByWallet(campaign.brand);
  const creatorProfile = getProfileByWallet(campaign.influencer);

  const progress = (() => {
    if (campaign.state === 3) {
      return 100;
    }

    if (campaign.milestones.length > 0) {
      const weightedMilestoneProgress = campaign.milestones.reduce((score, milestone) => {
        if (milestone.paid) return score + 1;
        if (milestone.approved) return score + 0.5;
        return score;
      }, 0);
      return Math.round((weightedMilestoneProgress / campaign.milestones.length) * 100);
    }

    if (campaign.totalMilestoneAmount > 0n) {
      return Number((campaign.totalReleased * 100n) / campaign.totalMilestoneAmount);
    }

    return 0;
  })();

  const submittedProofs = campaign.milestones
    .map((milestone, idx) => {
      const normalizedProofHash = milestone.proofHash.trim();
      if (!normalizedProofHash) {
        return null;
      }

      const status = milestone.paid ? "Paid" : milestone.approved ? "Approved" : "Awaiting Approval";
      const statusColor = milestone.paid
        ? "#10b981"
        : milestone.approved
          ? "#6366f1"
          : "#f59e0b";

      return {
        key: `proof-${idx}`,
        milestoneLabel: `M${idx + 1}`,
        proofHash: normalizedProofHash,
        href: proofHref(normalizedProofHash),
        status,
        statusColor
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-heading font-bold text-indigo-600" style={{ background: "rgba(99,102,241,0.08)" }}>
            #{campaign.id.toString()}
          </div>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
            style={{ color: config.color, background: config.bg }}
          >
            <StateIcon size={12} strokeWidth={2.5} />
            {config.label}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-body font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Total Value</p>
          <p className="text-xl font-heading font-bold text-gray-900"><BnbValue amount={formatBnb(campaign.totalMilestoneAmount)} /></p>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      <div className="grid grid-cols-2 gap-3">
        <PartyCard title="Brand" icon={Building2} address={campaign.brand} profile={brandProfile} />
        <PartyCard title="Creator" icon={User} address={campaign.influencer} profile={creatorProfile} />
      </div>

      <div className="border border-gray-100 rounded-2xl p-4 bg-white/50">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} strokeWidth={2} className="text-gray-400" />
            <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">Progress</p>
          </div>
          <p className="text-xs font-heading font-bold" style={{ color: config.color }}>{progress.toFixed(0)}%</p>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(progress, 3)}%`,
              background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border border-gray-100 rounded-2xl p-4 bg-white/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Coins size={13} strokeWidth={2} className="text-gray-400" />
            <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">Escrowed</p>
          </div>
          <p className={`text-base font-mono font-bold ${campaign.totalEscrowed < campaign.totalMilestoneAmount ? "text-amber-500" : "text-emerald-500"}`}>
            <BnbValue amount={formatBnb(campaign.totalEscrowed)} />
          </p>
        </div>
        <div className="border border-gray-100 rounded-2xl p-4 bg-white/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Wallet size={13} strokeWidth={2} className="text-gray-400" />
            <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">Released</p>
          </div>
          <p className="text-base font-mono font-bold text-gray-900"><BnbValue amount={formatBnb(campaign.totalReleased)} /></p>
        </div>
      </div>

      <div className="border border-gray-100 rounded-2xl p-4 bg-white/50 space-y-4">
        <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">Milestones</p>
        <div className="flex gap-2 flex-wrap">
          {campaign.milestones.map((m, idx) => (
            <div
              key={idx}
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all group cursor-default"
              style={{
                background: m.paid
                  ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.08))"
                  : m.approved
                    ? "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))"
                    : m.proofHash.length > 0
                      ? "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.06))"
                      : "rgba(0,0,0,0.03)",
                color: m.paid ? "#10b981" : m.approved ? "#6366f1" : m.proofHash.length > 0 ? "#f59e0b" : "#9ca3af",
                border: `1.5px solid ${m.paid
                  ? "rgba(16,185,129,0.3)"
                  : m.approved
                    ? "rgba(99,102,241,0.3)"
                    : m.proofHash.length > 0
                      ? "rgba(245,158,11,0.25)"
                      : "rgba(0,0,0,0.06)"
                  }`
              }}
              title={`M${idx + 1}: ${formatBnb(m.amount)} - ${m.paid ? "Paid" : m.approved ? "Approved" : m.proofHash.length > 0 ? "Proof Submitted" : "Pending"}`}
            >
              {m.paid ? <CheckCircle2 size={14} strokeWidth={2.5} /> : idx + 1}
            </div>
          ))}
        </div>

        {submittedProofs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">Submitted Proofs</p>
            <div className="space-y-2">
              {submittedProofs.map((proof) => (
                <div key={proof.key} className="rounded-xl border border-gray-100 bg-white/70 px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">{proof.milestoneLabel}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                        style={{ color: proof.statusColor, background: `${proof.statusColor}1A` }}
                      >
                        {proof.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono break-all" title={proof.proofHash}>
                      {shortProof(proof.proofHash)}
                    </p>
                  </div>

                  {proof.href ? (
                    <a
                      href={proof.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      View
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="shrink-0 text-[10px] px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 font-bold">Invalid link</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {actionSlot && (
          <>
            <div className="h-px bg-gray-100" />
            <div className="flex flex-wrap gap-2 justify-end">{actionSlot}</div>
          </>
        )}
      </div>
    </div>
  );
}
