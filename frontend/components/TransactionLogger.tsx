"use client";

import { useTransactionLog } from "@/context/TransactionLogContext";
import { Card, CardHeader, CardBody, Button, Chip, Divider } from "@heroui/react";

const statusColor: Record<string, "warning" | "success" | "danger" | "primary" | "default"> = {
  pending: "warning",
  confirmed: "success",
  failed: "danger",
  info: "primary",
};

export function TransactionLogger() {
  const { logs, clearLogs } = useTransactionLog();

  return (
    <Card className="w-full">
      <CardHeader className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-default-700">Transaction Logger</h2>
        <Button size="sm" variant="flat" onPress={clearLogs}>
          Clear
        </Button>
      </CardHeader>
      <Divider />
      <CardBody className="px-4 py-3">
        {logs.length === 0 && (
          <p className="text-xs text-default-400 font-medium text-center py-4">No transaction activity yet.</p>
        )}

        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="p-3 rounded-lg border border-default-200 bg-default-50 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-default-900">{log.action}</p>
                <Chip size="sm" variant="flat" color={statusColor[log.status] ?? "default"} className="h-5 text-[10px] font-bold">
                  {log.status.toUpperCase()}
                </Chip>
              </div>
              <p className="text-default-500 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
              {log.txHash && <p className="break-all text-default-400 font-mono mt-0.5">Tx: {log.txHash}</p>}
              {log.detail && <p className="text-default-400 mt-0.5">{log.detail}</p>}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
