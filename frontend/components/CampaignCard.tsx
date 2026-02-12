"use client";

import { CampaignView, formatBnb, stateLabel } from "@/lib/campaigns";
import { CheckCircle2, Clock, Wallet, XCircle, User, Building2, TrendingUp, Coins } from "lucide-react";
import { BnbValue } from "@/components/BnbValue";

function shortAddr(v: string) {
  return `${v.slice(0, 6)}…${v.slice(-4)}`;
}

type CampaignCardProps = {
  campaign: CampaignView;
  actionSlot?: React.ReactNode;
};

const stateConfig: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  Created: { color: "#6366f1", bg: "rgba(99,102,241,0.1)", icon: Clock, label: "Created" },
  Funded: { color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: Wallet, label: "Funded" },
  Completed: { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", icon: CheckCircle2, label: "Completed" },
  Cancelled: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: XCircle, label: "Cancelled" },
};

export function CampaignCard({ campaign, actionSlot }: CampaignCardProps) {
  const state = stateLabel(campaign.state);
  const config = stateConfig[state] || stateConfig.Created;
  const StateIcon = config.icon;

  const progress =
    campaign.totalMilestoneAmount > 0n
      ? Number((campaign.totalReleased * 100n) / campaign.totalMilestoneAmount)
      : 0;

  return (
    <div className="p-6 space-y-5">
      {/* ── Header: Campaign ID + Status + Total Value ── */}
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

      {/* ── Divider ── */}
      <div className="h-px bg-gray-100" />

      {/* ── Parties Section ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-gray-100 rounded-2xl p-4 bg-white/50">
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 size={13} strokeWidth={2} className="text-gray-400" />
            <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">Brand</p>
          </div>
          <p className="text-sm font-mono font-bold text-gray-900">{shortAddr(campaign.brand)}</p>
        </div>
        <div className="border border-gray-100 rounded-2xl p-4 bg-white/50">
          <div className="flex items-center gap-1.5 mb-2">
            <User size={13} strokeWidth={2} className="text-gray-400" />
            <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400">Creator</p>
          </div>
          <p className="text-sm font-mono font-bold text-gray-900">{shortAddr(campaign.influencer)}</p>
        </div>
      </div>

      {/* ── Progress Section ── */}
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
              background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
            }}
          />
        </div>
      </div>

      {/* ── Financials Section ── */}
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

      {/* ── Milestones Section ── */}
      <div className="border border-gray-100 rounded-2xl p-4 bg-white/50">
        <p className="text-[10px] font-body font-bold uppercase tracking-widest text-gray-400 mb-3">Milestones</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {campaign.milestones.map((m, idx) => (
              <div
                key={idx}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: m.paid ? "rgba(16,185,129,0.12)" : m.approved ? "rgba(99,102,241,0.12)" : "rgba(0,0,0,0.04)",
                  color: m.paid ? "#10b981" : m.approved ? "#6366f1" : "#9ca3af",
                  border: `1.5px solid ${m.paid ? "rgba(16,185,129,0.25)" : m.approved ? "rgba(99,102,241,0.25)" : "rgba(0,0,0,0.08)"}`,
                }}
                title={`M${idx + 1}: ${formatBnb(m.amount)} — ${m.paid ? "Paid" : m.approved ? "Approved" : "Pending"}`}
              >
                {idx + 1}
              </div>
            ))}
          </div>

          {actionSlot && <div className="flex gap-2">{actionSlot}</div>}
        </div>
      </div>
    </div>
  );
}
