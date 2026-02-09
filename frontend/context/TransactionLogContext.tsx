"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type TxLogStatus = "pending" | "confirmed" | "failed" | "info";

export type TxLogEntry = {
  id: string;
  timestamp: string;
  action: string;
  status: TxLogStatus;
  txHash?: string;
  detail?: string;
};

type TxLogContextValue = {
  logs: TxLogEntry[];
  addLog: (entry: Omit<TxLogEntry, "id" | "timestamp">) => string;
  updateLog: (id: string, patch: Partial<Omit<TxLogEntry, "id" | "timestamp">>) => void;
  clearLogs: () => void;
};

const TxLogContext = createContext<TxLogContextValue | null>(null);

export function TransactionLogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<TxLogEntry[]>([]);

  const addLog = (entry: Omit<TxLogEntry, "id" | "timestamp">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();
    setLogs((prev) => [{ id, timestamp, ...entry }, ...prev].slice(0, 100));
    return id;
  };

  const updateLog = (id: string, patch: Partial<Omit<TxLogEntry, "id" | "timestamp">>) => {
    setLogs((prev) => prev.map((log) => (log.id === id ? { ...log, ...patch } : log)));
  };

  const clearLogs = () => setLogs([]);

  const value = useMemo(() => ({ logs, addLog, updateLog, clearLogs }), [logs]);

  return <TxLogContext.Provider value={value}>{children}</TxLogContext.Provider>;
}

export function useTransactionLog() {
  const ctx = useContext(TxLogContext);
  if (!ctx) {
    throw new Error("useTransactionLog must be used within TransactionLogProvider");
  }
  return ctx;
}
