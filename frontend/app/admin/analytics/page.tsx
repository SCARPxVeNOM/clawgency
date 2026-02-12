"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { RoleGuard } from "@/components/RoleGuard";
import { fetchAllCampaigns } from "@/lib/campaigns";
import { isContractConfigured } from "@/lib/contract";
import type { Workflow3Response } from "@/types/agent";
import { Card, CardBody, CardHeader, Button, Input, Textarea, Checkbox, Spacer, Divider } from "@heroui/react";

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
        | { parsedReplies?: ParsedEmailReply[]; error?: string }
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
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-default-900">🛡️ Admin Analytics</h1>
          <p className="text-sm text-default-500 font-medium mt-1">
            Operational metrics and governance review
          </p>
        </div>

        {/* Stats */}
        <section className="grid grid-cols-3 gap-3">
          <Card className="" shadow="sm">
            <CardBody className="py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-default-500">Campaigns</p>
              <p className="text-2xl font-black text-default-900 mt-1">{campaignCount}</p>
            </CardBody>
          </Card>
          <Card className="bg-warning-50 border border-warning-200" shadow="sm">
            <CardBody className="py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-warning-700">Pending Proofs</p>
              <p className="text-2xl font-black text-warning-900 mt-1">{pendingProofs}</p>
            </CardBody>
          </Card>
          <Card className="bg-primary-50 border border-primary-200" shadow="sm">
            <CardBody className="py-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-700">Pending Approvals</p>
              <p className="text-2xl font-black text-primary-900 mt-1">{pendingApprovals}</p>
            </CardBody>
          </Card>
        </section>

        {/* Agent Logs */}
        <Card className="w-full">
          <CardHeader className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-default-900">Agent Interaction Logs</h3>
            <Button size="sm" variant="flat" onPress={() => void runMonitoringScan()} isDisabled={monitoringLoading} isLoading={monitoringLoading}>
              {monitoringLoading ? "Running..." : "🔄 Run Monitor Now"}
            </Button>
          </CardHeader>
          <Divider />
          <CardBody>
            {monitoring && (
              <Card className="bg-default-50 mb-4" shadow="none" radius="sm">
                <CardBody className="p-3 text-xs">
                  <p className="font-bold">Window: {monitoring.monitoringWindow.fromBlock} to {monitoring.monitoringWindow.toBlock}</p>
                  <p>Observed events: {monitoring.observedEvents.length}</p>
                  <p>Alerts: {monitoring.alerts.length}</p>
                  {monitoring.recommendations.length > 0 && (
                    <p className="mt-1 font-bold">Top: {monitoring.recommendations[0].recommendation}</p>
                  )}
                </CardBody>
              </Card>
            )}

            <div className="space-y-2">
              {logs.length === 0 && <p className="text-xs text-default-400 font-bold">No logs logs available.</p>}
              {logs.slice().reverse().map((log, idx) => (
                <div key={`${log.timestamp ?? "log"}-${idx}`} className="p-3 border border-default-200 rounded-lg text-xs hover:bg-default-50 transition-colors">
                  <p className="font-bold text-default-900">{(log.workflow as string) ?? "workflow"}</p>
                  <p className="text-default-500">Time: {(log.timestamp as string) ?? "N/A"}</p>
                  <p className="text-default-500">User: {(log.userId as string) ?? "N/A"}</p>
                  <p className="break-all text-default-500">Event: {(log.chainEventHash as string) ?? "N/A"}</p>
                  <p className="text-default-500">Rec: {(log.recommendation as string) ?? "N/A"}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Email Approval Gate */}
        <Card className="w-full">
          <CardHeader className="flex flex-col items-start gap-1 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-default-900">Human Approval Gate (Email)</h3>
            <p className="text-xs text-default-500 font-medium">
              Draft preview and explicit approval required before send.
            </p>
          </CardHeader>
          <Divider />
          <CardBody className="gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Recipient Email" value={sendTo} onValueChange={setSendTo} size="sm" />
              <Input label="Approver ID" value={sendApprover} onValueChange={setSendApprover} size="sm" />
              <Input label="Campaign ID (Optional)" value={sendCampaignId} onValueChange={setSendCampaignId} size="sm" />
              <Input label="Draft ID (Optional)" value={sendDraftId} onValueChange={setSendDraftId} size="sm" />
            </div>

            <Input label="Subject" value={sendSubject} onValueChange={setSendSubject} size="sm" />
            <Textarea label="Body Text" value={sendBodyText} onValueChange={setSendBodyText} minRows={3} />
            <Textarea label="Body HTML (Optional)" value={sendBodyHtml} onValueChange={setSendBodyHtml} minRows={2} />

            {/* Preview */}
            <Card className="bg-default-50" shadow="none" radius="sm">
              <CardBody className="p-3 text-xs">
                <p className="font-bold text-default-900">Final Draft Preview</p>
                <p className="text-default-500 mt-1">To: {sendTo.trim() || "N/A"}</p>
                <p className="text-default-500">Subject: {sendSubject.trim() || "N/A"}</p>
                <p className="mt-1 text-default-500 whitespace-pre-wrap break-words">Body: {sendBodyText.trim() || "N/A"}</p>
              </CardBody>
            </Card>

            <Checkbox isSelected={sendConfirmed} onValueChange={setSendConfirmed} size="sm">
              I confirm this draft was manually reviewed and approved.
            </Checkbox>

            <Button onPress={() => void sendWithHumanApproval()} isLoading={sendLoading} color="primary" className="w-full">
              {sendLoading ? "Sending..." : "✅ Approve + Send"}
            </Button>

            {lastSendResult && (
              <Card className="bg-success-50 border-success-200 border" shadow="none" radius="sm">
                <CardBody className="p-3 text-xs">
                  <p className="font-bold text-success-800">Last Approved Send</p>
                  <p className="text-success-700">Mode: {lastSendResult.sent.mode}</p>
                  <p className="text-success-700">Message: {lastSendResult.sent.messageId}</p>
                  <p className="text-success-700">Thread: {lastSendResult.sent.threadId}</p>
                  <p className="text-success-700">Session: {lastSendResult.approval.approvalSessionId}</p>
                </CardBody>
              </Card>
            )}

            <Spacer y={2} />

            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-default-900">Approval Audit Trail</h4>
              <Button size="sm" variant="bordered" onPress={() => void loadHumanApprovalLogs()} isLoading={approvalLogsLoading}>
                Refresh
              </Button>
            </div>

            <div className="space-y-2">
              {approvalLogs.length === 0 && <p className="text-xs text-default-400 font-bold">No approval logs yet.</p>}
              {approvalLogs.slice().reverse().map((log, index) => (
                <div key={`${log.timestamp ?? "approval"}-${log.approvalSessionId ?? index}`} className="p-3 border border-default-200 rounded-lg text-xs hover:bg-default-50 transition-colors">
                  <p className="font-bold text-default-900">{log.outcome ?? "unknown"}</p>
                  <p className="text-default-500">Time: {log.timestamp ?? "N/A"}</p>
                  <p className="text-default-500">Approver: {log.humanApprovedBy ?? "N/A"}</p>
                  <p className="text-default-500">Session: {log.approvalSessionId ?? "N/A"}</p>
                  <p className="text-default-500">Campaign: {log.campaignId ?? "N/A"}</p>
                  <p className="text-default-500">Draft: {log.draftId ?? "N/A"}</p>
                  <p className="break-all text-default-500">Message: {log.messageId ?? "N/A"}</p>
                  <p className="break-all text-default-500">Thread: {log.threadId ?? "N/A"}</p>
                  {typeof log.error === "string" && log.error && <p className="text-danger font-bold">Error: {log.error}</p>}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Email Reply Intelligence */}
        <Card className="w-full">
          <CardHeader className="flex flex-col items-start gap-1 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-default-900">Email Reply Intelligence</h3>
            <p className="text-xs text-default-500 font-medium">
              Parsed from platform-managed inbox. AI output is advisory and requires human review.
            </p>
            <Button onPress={() => void loadEmailReplies()} isLoading={emailRepliesLoading} size="sm" className="mt-2">
              📧 Load Parsed Replies
            </Button>
          </CardHeader>
          <Divider />
          <CardBody>
            <div className="space-y-2">
              {emailReplies.length === 0 && <p className="text-xs text-default-400 font-bold">No parsed replies loaded.</p>}
              {emailReplies.map((item) => (
                <div key={item.reply.messageId} className="p-3 border border-default-200 rounded-lg text-xs hover:bg-default-50 transition-colors">
                  <p className="font-bold text-default-900">{item.reply.subject || "Email Reply"}</p>
                  <p className="text-default-500">From: {item.reply.fromEmail || "unknown"}</p>
                  <p className="text-default-500">Received: {item.reply.receivedAt || "N/A"}</p>
                  <p className="text-default-500">
                    Interest: <span className="font-bold">{item.parsed.interest.toUpperCase()}</span> ({item.parsed.confidence.toFixed(2)})
                  </p>
                  <p className="text-default-500">Reasoning: {item.parsed.reasoning}</p>
                  {item.parsed.questions.length > 0 && (
                    <p className="text-default-500">Questions: {item.parsed.questions.join(" | ")}</p>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

      </div>
    </RoleGuard>
  );
}
