"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSession } from "@/context/SessionContext";
import { Card, CardHeader, CardBody, Chip, Divider } from "@heroui/react";

export default function LoginPage() {
  const { role, setRole, walletAddress, isConnected, isAdminWallet } = useSession();

  const roles = [
    { key: "brand" as const, title: "Brand", desc: "Create terms, fund campaigns, approve milestones, release payouts.", color: "primary" },
    { key: "influencer" as const, title: "Influencer", desc: "Validate proof links, submit deliverables, track approvals.", color: "success" },
    { key: "admin" as const, title: "Admin", desc: "Monitor operations, review logs, enforce human approval controls.", color: "warning", disabled: !isAdminWallet },
  ];

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="flex flex-col items-start px-6 pt-6 pb-2">
          <h2 className="text-2xl font-bold text-default-900">🔐 Wallet Login</h2>
          <p className="text-sm text-default-500 font-medium mt-1">
            Connect your wallet, then choose your role.
          </p>
        </CardHeader>

        <Divider />

        <CardBody className="px-6 py-4 space-y-6">
          {/* Wallet Connect */}
          <div className="bg-default-50 p-4 rounded-xl border border-default-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-default-500 mb-3">Connect Wallet</p>
            <div className="flex justify-start">
              <ConnectButton />
            </div>
          </div>

          {/* Status */}
          <div className="bg-default-50 p-4 rounded-xl border border-default-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-default-500">Connected Wallet</p>
            <p className="mt-1 break-all text-sm font-mono font-bold text-default-900">
              {walletAddress ?? "Not connected"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Chip size="sm" variant="flat" color={isConnected ? "success" : "default"}>
                {isConnected ? "✅ Connected" : "❌ Disconnected"}
              </Chip>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-default-500">Choose Role</p>
            <div className="grid gap-3">
              {roles.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRole(r.key)}
                  disabled={r.disabled}
                  className={`w-full text-left p-4 rounded-xl transition-all border-2 ${role === r.key
                    ? `border-${r.color === 'warning' ? 'warning' : r.color === 'success' ? 'success' : 'primary'} bg-${r.color === 'warning' ? 'warning' : r.color === 'success' ? 'success' : 'primary'}/10`
                    : "border-transparent bg-default-50 hover:bg-default-100"
                    } ${r.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <p className={`font-bold ${role === r.key ? `text-${r.color === 'warning' ? 'warning-700' : r.color === 'success' ? 'success-700' : 'primary-700'}` : "text-default-900"}`}>
                    {r.title}
                  </p>
                  <p className="text-xs text-default-500 font-medium mt-0.5">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
