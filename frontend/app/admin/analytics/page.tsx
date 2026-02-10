"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RoleGuard } from "@/components/RoleGuard";
import { fetchAllCampaigns } from "@/lib/campaigns";
import { isContractConfigured } from "@/lib/contract";
import type { Workflow3Response } from "@/types/agent";

type AgentLog = {
  timestamp?: string;
  workflow?: string;
  userId?: string;
  chainEventHash?: string;
  recommendation?: string;
  [key: string]: unknown;
};

type ParsedEmailReply = {
  reply: {
    messageId: string;
    threadId: string;
    fromEmail: string;
    subject: string;
    receivedAt: string;
    bodyText: string;
  };
  parsed: {
    interest: "yes" | "no" | "maybe";
    questions: string[];
    confidence: number;
    reasoning: string;
    requiresHumanReview: true;
  };
};

type HumanApprovalLog = {
  timestamp?: string;
  category?: string;
  approvalSessionId?: string;
  humanApprovedBy?: string;
  campaignId?: string | null;
  draftId?: string | null;
  to?: string;
  subject?: string;
  messageId?: string | null;
  threadId?: string | null;
  providerMode?: string;
  outcome?: string;
  error?: string | null;
  [key: string]: unknown;
};

type EmailSendSuccessPayload = {
  sent: {
    mode: "mock" | "live";
    messageId: string;
    threadId: string;
    from: string;
    to: string;
    subject: string;
  };
  approval: {
    approvalSessionId: string;
    approvedBy: string;
    confirmed: true;
    campaignId: string | null;
    draftId: string | null;
  };
  policy: {
    explicitHumanApprovalGate: true;
    sentByBackendOnly: true;
    platformManagedAccountOnly: true;
    approvedBy: string;
  };
};

function createApprovalSessionId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `approval_${Date.now()}_${random}`;
}

export default function AdminAnalyticsPage() {
  const [campaignCount, setCampaignCount] = useState(0);
  const [pendingProofs, setPendingProofs] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [monitoring, setMonitoring] = useState<Workflow3Response | null>(null);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const [emailReplies, setEmailReplies] = useState<ParsedEmailReply[]>([]);
  const [emailRepliesLoading, setEmailRepliesLoading] = useState(false);
  const [approvalLogs, setApprovalLogs] = useState<HumanApprovalLog[]>([]);
  const [approvalLogsLoading, setApprovalLogsLoading] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendBodyText, setSendBodyText] = useState("");
  const [sendBodyHtml, setSendBodyHtml] = useState("");
  const [sendApprover, setSendApprover] = useState("admin_manual_approval");
  const [sendCampaignId, setSendCampaignId] = useState("");
  const [sendDraftId, setSendDraftId] = useState("");
  const [sendConfirmed, setSendConfirmed] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [lastSendResult, setLastSendResult] = useState<EmailSendSuccessPayload | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      const campaigns = isContractConfigured ? await fetchAllCampaigns() : [];
      setCampaignCount(campaigns.length);
      setPendingProofs(
        campaigns.reduce((sum, campaign) => sum + campaign.milestones.filter((m) => !m.proofHash && !m.paid).length, 0)
      );
      setPendingApprovals(
        campaigns.reduce((sum, campaign) => sum + campaign.milestones.filter((m) => m.proofHash && !m.approved).length, 0)
      );
    } catch {
      setCampaignCount(0);
      setPendingProofs(0);
      setPendingApprovals(0);
    }

    const response = await fetch("/api/agent-logs");
    if (response.ok) {
      const payload = await response.json();
      setLogs(payload.logs ?? []);
    }
  }, []);

  const loadHumanApprovalLogs = useCallback(async () => {
    setApprovalLogsLoading(true);
    try {
      const response = await fetch("/api/email/approval-logs?limit=50");
      const payload = (await response.json()) as { logs?: HumanApprovalLog[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load human approval logs.");
      }
      setApprovalLogs(payload.logs ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load human approval logs.";
      toast.error(message);
    } finally {
      setApprovalLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
    const interval = setInterval(() => void loadAnalytics(), 15_000);
    return () => clearInterval(interval);
  }, [loadAnalytics]);

  useEffect(() => {
    void loadHumanApprovalLogs();
    const interval = setInterval(() => void loadHumanApprovalLogs(), 30_000);
    return () => clearInterval(interval);
  }, [loadHumanApprovalLogs]);

  async function runMonitoringScan() {
    setMonitoringLoading(true);
    try {
      const response = await fetch("/api/agent/workflow3", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      });

      const payload = (await response.json()) as Workflow3Response | { error?: string };
      if (!response.ok) {
        throw new Error(payload && "error" in payload ? payload.error ?? "Monitoring execution failed." : "Monitoring execution failed.");
      }

      setMonitoring(payload as Workflow3Response);
      toast.success("Monitoring scan completed.");
      await loadAnalytics();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Monitoring execution failed.";
      toast.error(message);
    } finally {
      setMonitoringLoading(false);
    }
  }

  async function loadEmailReplies() {
    setEmailRepliesLoading(true);
    try {
      const response = await fetch("/api/email/replies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxResults: 10 })
      });

      const payload = (await response.json()) as
        | {
            parsedReplies?: ParsedEmailReply[];
            error?: string;
          }
        | undefined;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to load parsed email replies.");
      }

      setEmailReplies(payload?.parsedReplies ?? []);
      toast.success("Parsed email replies loaded.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load parsed email replies.";
      toast.error(message);
    } finally {
      setEmailRepliesLoading(false);
    }
  }

  async function sendWithHumanApproval() {
    if (!sendConfirmed) {
      toast.error("Confirm manual review before sending.");
      return;
    }
    if (!sendTo.trim() || !sendSubject.trim() || !sendBodyText.trim() || !sendApprover.trim()) {
      toast.error("To, subject, bodyText, and human approver are required.");
      return;
    }

    setSendLoading(true);
    const approvalSessionId = createApprovalSessionId();

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: sendTo.trim(),
          subject: sendSubject.trim(),
          bodyText: sendBodyText.trim(),
          bodyHtml: sendBodyHtml.trim() || undefined,
          humanApprovedBy: sendApprover.trim(),
          humanApprovalConfirmed: true,
          approvalSessionId,
          campaignId: sendCampaignId.trim() || undefined,
          draftId: sendDraftId.trim() || undefined
        })
      });

      const payload = (await response.json()) as EmailSendSuccessPayload | { error?: string };
      if (!response.ok) {
        throw new Error(payload && "error" in payload ? payload.error ?? "Email send failed." : "Email send failed.");
      }

      setLastSendResult(payload as EmailSendSuccessPayload);
      setSendConfirmed(false);
      toast.success("Email sent with explicit human approval gate.");
      await loadHumanApprovalLogs();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email send failed.";
      toast.error(message);
    } finally {
      setSendLoading(false);
    }
  }

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-5">
        <section className="section-card reveal-up p-5">
          <h2 className="card-title">Admin Analytics</h2>
          <p className="card-subtitle">
            Operational metrics and OpenClaw recommendation trails for governance review.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MetricCard label="Campaigns" value={campaignCount.toString()} />
            <MetricCard label="Pending Proofs" value={pendingProofs.toString()} />
            <MetricCard label="Pending Approvals" value={pendingApprovals.toString()} />
          </div>
        </section>

        <section className="section-card reveal-up reveal-delay-1 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">Agent Interaction Logs</h3>
          <button onClick={() => void runMonitoringScan()} disabled={monitoringLoading} className="btn-primary mt-3 px-3 py-1.5 text-xs">
            {monitoringLoading ? "Running..." : "Run Monitor Now"}
          </button>

          {monitoring && (
            <div className="mt-3 rounded-lg border border-slate-200/85 bg-white/70 p-3 text-xs text-steel">
              <p>
                Window: {monitoring.monitoringWindow.fromBlock} to {monitoring.monitoringWindow.toBlock}
              </p>
              <p>Observed events: {monitoring.observedEvents.length}</p>
              <p>Alerts: {monitoring.alerts.length}</p>
              {monitoring.recommendations.length > 0 && (
                <p>Top recommendation: {monitoring.recommendations[0].recommendation}</p>
              )}
            </div>
          )}

          <div className="mt-3 space-y-2.5">
            {logs.length === 0 && <p className="text-xs text-steel">No logs available.</p>}
            {logs.slice().reverse().map((log, idx) => (
              <div key={`${log.timestamp ?? "log"}-${idx}`} className="log-entry text-xs">
                <p className="font-semibold text-ink">{(log.workflow as string) ?? "workflow"}</p>
                <p className="text-steel">Time: {(log.timestamp as string) ?? "N/A"}</p>
                <p className="text-steel">User: {(log.userId as string) ?? "N/A"}</p>
                <p className="break-all text-steel">Event Hash: {(log.chainEventHash as string) ?? "N/A"}</p>
                <p className="text-steel">Recommendation: {(log.recommendation as string) ?? "N/A"}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-card reveal-up reveal-delay-2 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">Human Approval Gate (Email Send)</h3>
          <p className="mt-1 text-xs text-steel">
            Draft preview and explicit approval are required before backend send. Every decision is written to approval audit logs.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={sendTo}
              onChange={(event) => setSendTo(event.target.value)}
              placeholder="Recipient email"
              className="input-field"
            />
            <input
              value={sendApprover}
              onChange={(event) => setSendApprover(event.target.value)}
              placeholder="Human approver id"
              className="input-field"
            />
            <input
              value={sendCampaignId}
              onChange={(event) => setSendCampaignId(event.target.value)}
              placeholder="Campaign id (optional)"
              className="input-field"
            />
            <input
              value={sendDraftId}
              onChange={(event) => setSendDraftId(event.target.value)}
              placeholder="Draft id (optional)"
              className="input-field"
            />
          </div>

          <input
            value={sendSubject}
            onChange={(event) => setSendSubject(event.target.value)}
            placeholder="Email subject"
            className="input-field mt-3"
          />

          <textarea
            value={sendBodyText}
            onChange={(event) => setSendBodyText(event.target.value)}
            placeholder="Email body text"
            className="input-field mt-3 min-h-[120px]"
          />

          <textarea
            value={sendBodyHtml}
            onChange={(event) => setSendBodyHtml(event.target.value)}
            placeholder="Optional HTML body"
            className="input-field mt-3 min-h-[96px]"
          />

          <div className="mt-3 rounded-lg border border-slate-200/85 bg-white/70 p-3 text-xs text-steel">
            <p className="font-semibold text-ink">Final Draft Preview</p>
            <p className="mt-1">To: {sendTo.trim() || "N/A"}</p>
            <p>Subject: {sendSubject.trim() || "N/A"}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">
              Body: {sendBodyText.trim() || "N/A"}
            </p>
          </div>

          <label className="mt-3 flex items-start gap-2 text-xs text-steel">
            <input
              type="checkbox"
              className="mt-0.5 h-3.5 w-3.5 accent-sky-600"
              checked={sendConfirmed}
              onChange={(event) => setSendConfirmed(event.target.checked)}
            />
            <span>I confirm this draft was manually reviewed and approved for send.</span>
          </label>

          <button onClick={() => void sendWithHumanApproval()} disabled={sendLoading} className="btn-primary mt-3 px-3 py-2 text-xs">
            {sendLoading ? "Sending..." : "Approve + Send Email"}
          </button>

          {lastSendResult && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-semibold">Last Approved Send</p>
              <p>Mode: {lastSendResult.sent.mode}</p>
              <p>Message: {lastSendResult.sent.messageId}</p>
              <p>Thread: {lastSendResult.sent.threadId}</p>
              <p>Approval Session: {lastSendResult.approval.approvalSessionId}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-steel">Approval Audit Trail</h4>
            <button onClick={() => void loadHumanApprovalLogs()} disabled={approvalLogsLoading} className="btn-secondary px-2.5 py-1 text-xs">
              {approvalLogsLoading ? "Loading..." : "Refresh Logs"}
            </button>
          </div>

          <div className="mt-2 space-y-2.5">
            {approvalLogs.length === 0 && <p className="text-xs text-steel">No approval logs yet.</p>}
            {approvalLogs.slice().reverse().map((log, index) => (
              <div key={`${log.timestamp ?? "approval"}-${log.approvalSessionId ?? index}`} className="log-entry text-xs">
                <p className="font-semibold text-ink">{log.outcome ?? "unknown"}</p>
                <p className="text-steel">Time: {log.timestamp ?? "N/A"}</p>
                <p className="text-steel">Approver: {log.humanApprovedBy ?? "N/A"}</p>
                <p className="text-steel">Approval Session: {log.approvalSessionId ?? "N/A"}</p>
                <p className="text-steel">Campaign: {log.campaignId ?? "N/A"}</p>
                <p className="text-steel">Draft: {log.draftId ?? "N/A"}</p>
                <p className="break-all text-steel">Message: {log.messageId ?? "N/A"}</p>
                <p className="break-all text-steel">Thread: {log.threadId ?? "N/A"}</p>
                {typeof log.error === "string" && log.error && <p className="text-red-700">Error: {log.error}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="section-card reveal-up reveal-delay-3 p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-steel">Email Reply Intelligence</h3>
          <p className="mt-1 text-xs text-steel">
            Parsed from platform-managed inbox label only. Moltbot output is advisory and requires human review.
          </p>
          <button onClick={() => void loadEmailReplies()} disabled={emailRepliesLoading} className="btn-primary mt-3 px-3 py-1.5 text-xs">
            {emailRepliesLoading ? "Loading..." : "Load Parsed Email Replies"}
          </button>

          <div className="mt-3 space-y-2.5">
            {emailReplies.length === 0 && <p className="text-xs text-steel">No parsed email replies loaded yet.</p>}
            {emailReplies.map((item) => (
              <div key={item.reply.messageId} className="log-entry text-xs">
                <p className="font-semibold text-ink">{item.reply.subject || "Email Reply"}</p>
                <p className="text-steel">From: {item.reply.fromEmail || "unknown"}</p>
                <p className="text-steel">Received: {item.reply.receivedAt || "N/A"}</p>
                <p className="text-steel">
                  Interest: {item.parsed.interest.toUpperCase()} ({item.parsed.confidence.toFixed(2)})
                </p>
                <p className="text-steel">Reasoning: {item.parsed.reasoning}</p>
                {item.parsed.questions.length > 0 && (
                  <p className="text-steel">Questions: {item.parsed.questions.join(" | ")}</p>
                )}
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
    <div className="metric-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  );
}
