"use client";

import { useTransactionLog } from "@/context/TransactionLogContext";

const statusColor: Record<string, string> = {
  pending: "text-amber-700",
  confirmed: "text-green-700",
  failed: "text-red-700",
  info: "text-blue-700"
};

export function TransactionLogger() {
  const { logs, clearLogs } = useTransactionLog();

  return (
    <section className="section-card reveal-up reveal-delay-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Transaction Logger</h2>
        <button className="btn-secondary px-2.5 py-1 text-xs text-steel" onClick={clearLogs}>
          Clear
        </button>
      </div>
      {logs.length === 0 && <p className="mt-3 text-xs text-steel">No transaction activity yet.</p>}
      <ul className="mt-3 space-y-2.5">
        {logs.map((log) => (
          <li key={log.id} className="log-entry text-xs">
            <p className="font-semibold text-ink">{log.action}</p>
            <p className={statusColor[log.status] ?? "text-steel"}>{log.status.toUpperCase()}</p>
            <p className="text-steel">{new Date(log.timestamp).toLocaleString()}</p>
            {log.txHash && <p className="break-all text-steel">Tx: {log.txHash}</p>}
            {log.detail && <p className="text-steel">{log.detail}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
