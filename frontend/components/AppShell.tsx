"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useSession } from "@/context/SessionContext";

const roleOptions = [
  { role: "brand", label: "Brand" },
  { role: "influencer", label: "Influencer" },
  { role: "admin", label: "Admin" }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { role, setRole, isAdminWallet } = useSession();

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-steel">Clawgency Slot 2</p>
            <h1 className="text-xl font-semibold text-ink">AI-Powered On-Chain Influencer Agency</h1>
          </div>
          <ConnectButton />
        </div>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link className="rounded-lg border border-slate-200 px-3 py-1.5 text-steel hover:text-ink" href="/login">
            Login
          </Link>
          <Link
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-steel hover:text-ink"
            href="/brand/dashboard"
          >
            Brand
          </Link>
          <Link
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-steel hover:text-ink"
            href="/influencer/dashboard"
          >
            Influencer
          </Link>
          <Link
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-steel hover:text-ink"
            href="/admin/analytics"
          >
            Admin
          </Link>
        </nav>
        <div className="mt-3 flex flex-wrap gap-2">
          {roleOptions.map((item) => {
            const disabled = item.role === "admin" && !isAdminWallet;
            return (
              <button
                key={item.role}
                disabled={disabled}
                onClick={() => setRole(item.role)}
                className={`rounded-full px-3 py-1 text-xs ${
                  role === item.role ? "bg-ink text-white" : "bg-mist text-steel"
                } disabled:opacity-40`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </header>
      <main className="mt-6">{children}</main>
    </div>
  );
}
