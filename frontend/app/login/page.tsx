"use client";

import NextLink from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card, CardBody, CardHeader, Chip, Divider } from "@heroui/react";
import { useSession } from "@/context/SessionContext";

export default function LoginPage() {
  const { role, setRole, walletAddress, isConnected, isAdminWallet, isRegistered, isProfileLoading, profile } = useSession();

  const roles = [
    {
      key: "brand" as const,
      title: "Brand",
      desc: "Create terms, fund campaigns, approve milestones, release payouts."
    },
    {
      key: "influencer" as const,
      title: "Influencer",
      desc: "Submit deliverables, validate proofs, and track approvals."
    },
    {
      key: "admin" as const,
      title: "Admin",
      desc: "Monitor operations and enforce human approval controls."
    }
  ];

  const needsRegistration = isConnected && !isRegistered && !isAdminWallet && !isProfileLoading;

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-4">
      <Card className="max-w-xl w-full">
        <CardHeader className="flex flex-col items-start px-6 pt-6 pb-2">
          <h2 className="text-2xl font-bold text-default-900">Wallet Login</h2>
          <p className="text-sm text-default-500 font-medium mt-1">Connect your wallet, then complete your profile registration.</p>
        </CardHeader>

        <Divider />

        <CardBody className="px-6 py-4 space-y-5">
          <div className="bg-default-50 p-4 rounded-xl border border-default-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-default-500 mb-3">Connect Wallet</p>
            <div className="flex justify-start">
              <ConnectButton />
            </div>
          </div>

          <div className="bg-default-50 p-4 rounded-xl border border-default-200 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-default-500">Connected Wallet</p>
            <p className="break-all text-sm font-mono font-bold text-default-900">{walletAddress ?? "Not connected"}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm" variant="flat" color={isConnected ? "success" : "default"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Chip>
              {isConnected && !isAdminWallet && isProfileLoading && (
                <Chip size="sm" variant="flat" color="default">
                  Checking profile...
                </Chip>
              )}
              {isRegistered && profile && (
                <Chip size="sm" variant="flat" color="primary">
                  Registered as {profile.role}
                </Chip>
              )}
            </div>
          </div>

          {needsRegistration && (
            <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-warning-700">Registration required</p>
              <p className="text-sm text-warning-900 font-medium">
                This wallet must be registered with role, socials, and email before using dashboards.
              </p>
              <NextLink
                href="/register"
                className="inline-flex px-3.5 py-2 rounded-lg text-xs font-bold bg-warning-100 text-warning-800 hover:bg-warning-200 transition-colors"
              >
                Complete Registration
              </NextLink>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-default-500">Choose Role</p>
            <div className="grid gap-3">
              {roles.map((entry) => {
                const disabledByAdmin = entry.key === "admin" && !isAdminWallet;
                const disabledByRegistration = entry.key !== "admin" && (!isRegistered || isProfileLoading);
                const profileRole = profile?.role;
                const disabledByLockedRole = Boolean(profileRole) && !isAdminWallet && entry.key !== profileRole;
                const disabled = disabledByAdmin || disabledByRegistration || disabledByLockedRole;
                const active = role === entry.key;

                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => setRole(entry.key)}
                    disabled={disabled}
                    className="w-full text-left p-4 rounded-xl transition-all border"
                    style={{
                      borderColor: active ? "rgba(99,102,241,0.35)" : "rgba(0,0,0,0.08)",
                      background: active ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.7)",
                      opacity: disabled ? 0.45 : 1,
                      cursor: disabled ? "not-allowed" : "pointer"
                    }}
                  >
                    <p className="font-bold text-default-900">{entry.title}</p>
                    <p className="text-xs text-default-500 font-medium mt-0.5">{entry.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {profile && !isAdminWallet && (
            <p className="text-[11px] text-default-500">
              Registered wallets have a fixed role. You can edit socials or avatar from <NextLink href="/register" className="font-semibold text-indigo-600">Profile Registration</NextLink>.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
