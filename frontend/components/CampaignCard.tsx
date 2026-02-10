"use client";

import { CampaignView, formatBnb, stateLabel } from "@/lib/campaigns";

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

type CampaignCardProps = {
  campaign: CampaignView;
  actionSlot?: React.ReactNode;
};

const stateClassMap: Record<string, string> = {
  Created: "status-created",
  Funded: "status-funded",
  Completed: "status-completed",
  Cancelled: "status-cancelled"
};

function calculateProgress(released: bigint, total: bigint): number {
  if (total === 0n) {
    return 0;
  }
  const basisPoints = (released * 10_000n) / total;
  return Math.min(100, Number(basisPoints) / 100);
}

export function CampaignCard({ campaign, actionSlot }: CampaignCardProps) {
  const state = stateLabel(campaign.state);
  const stateClass = stateClassMap[state] ?? "status-created";
  const progress = calculateProgress(campaign.totalReleased, campaign.totalMilestoneAmount);

  return (
    <article className="section-card reveal-up p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
        <h3 className="card-title">Campaign #{campaign.id.toString()}</h3>
        <span className={`status-chip ${stateClass}`}>{state}</span>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress.toFixed(2)}%` }} />
        </div>
        <p className="text-xs text-steel">Release Progress: {progress.toFixed(2)}%</p>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-steel md:grid-cols-2">
        <p className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2">Brand: {shortAddress(campaign.brand)}</p>
        <p className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2">
          Influencer: {shortAddress(campaign.influencer)}
        </p>
        <p className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2">Escrowed: {formatBnb(campaign.totalEscrowed)}</p>
        <p className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2">Released: {formatBnb(campaign.totalReleased)}</p>
        <p className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2">
          Total Budget: {formatBnb(campaign.totalMilestoneAmount)}
        </p>
        <p className="rounded-lg border border-slate-200/70 bg-white/70 px-3 py-2">
          Agency Fee: {(campaign.agencyFeeBps / 100).toFixed(2)}%
        </p>
      </div>

      <div className="mt-4 space-y-1.5 rounded-lg border border-slate-200/80 bg-white/70 p-3 text-xs shadow-sm">
        <p className="font-medium text-ink">Milestones</p>
        {campaign.milestones.map((m) => (
          <p key={m.index.toString()} className="rounded-md border border-slate-200/75 bg-white/80 px-2.5 py-1.5 text-steel">
            #{m.index.toString()} - {formatBnb(m.amount)} -{" "}
            {m.paid ? "Paid" : m.approved ? "Approved" : m.proofHash ? "Proof Submitted" : "Pending Proof"}
          </p>
        ))}
      </div>

      {actionSlot && <div className="mt-4 flex flex-wrap gap-2.5">{actionSlot}</div>}
    </article>
  );
}

