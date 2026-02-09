"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { fetchAllCampaigns } from "@/lib/campaigns";

type AgentLog = {
  timestamp?: string;
  workflow?: string;
  userId?: string;
  chainEventHash?: string;
  recommendation?: string;
  [key: string]: unknown;
};

export default function AdminAnalyticsPage() {
  const [campaignCount, setCampaignCount] = useState(0);
  const [pendingProofs, setPendingProofs] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [logs, setLogs] = useState<AgentLog[]>([]);

  const loadAnalytics = useCallback(async () => {
    const campaigns = await fetchAllCampaigns();
    setCampaignCount(campaigns.length);
    setPendingProofs(
      campaigns.reduce((sum, campaign) => sum + campaign.milestones.filter((m) => !m.proofHash && !m.paid).length, 0)
    );
    setPendingApprovals(
      campaigns.reduce((sum, campaign) => sum + campaign.milestones.filter((m) => m.proofHash && !m.approved).length, 0)
    );

    const response = await fetch("/api/agent-logs");
    if (response.ok) {
      const payload = await response.json();
      setLogs(payload.logs ?? []);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
    const interval = setInterval(() => void loadAnalytics(), 15_000);
    return () => clearInterval(interval);
  }, [loadAnalytics]);

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">Admin Analytics</h2>
          <p className="mt-2 text-sm text-steel">
            Operational metrics and OpenClaw recommendation trails for governance review.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MetricCard label="Campaigns" value={campaignCount.toString()} />
            <MetricCard label="Pending Proofs" value={pendingProofs.toString()} />
            <MetricCard label="Pending Approvals" value={pendingApprovals.toString()} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">Agent Interaction Logs</h3>
          <div className="mt-3 space-y-2">
            {logs.length === 0 && <p className="text-xs text-steel">No logs available.</p>}
            {logs.slice().reverse().map((log, idx) => (
              <div key={`${log.timestamp ?? "log"}-${idx}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                <p className="font-medium text-ink">{(log.workflow as string) ?? "workflow"}</p>
                <p className="text-steel">Time: {(log.timestamp as string) ?? "N/A"}</p>
                <p className="text-steel">User: {(log.userId as string) ?? "N/A"}</p>
                <p className="break-all text-steel">Event Hash: {(log.chainEventHash as string) ?? "N/A"}</p>
                <p className="text-steel">Recommendation: {(log.recommendation as string) ?? "N/A"}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </RoleGuard>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-mist p-4">
      <p className="text-xs uppercase tracking-wide text-steel">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}
