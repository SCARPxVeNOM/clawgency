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
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Transaction Logger</h2>
        <button className="text-xs text-steel underline" onClick={clearLogs}>
          Clear
        </button>
      </div>
      {logs.length === 0 && <p className="mt-3 text-xs text-steel">No transaction activity yet.</p>}
      <ul className="mt-3 space-y-2">
        {logs.map((log) => (
          <li key={log.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
            <p className="font-medium text-ink">{log.action}</p>
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
