"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSession } from "@/context/SessionContext";

export default function LoginPage() {
  const { role, setRole, walletAddress, isConnected, isAdminWallet } = useSession();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-ink">Wallet Login</h2>
      <p className="mt-2 text-sm text-steel">
        Connect your wallet, then choose the role-specific dashboard you want to operate.
      </p>

      <div className="mt-4">
        <ConnectButton />
      </div>

      <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs text-steel">Connected wallet</p>
        <p className="mt-1 break-all text-sm text-ink">{walletAddress ?? "Not connected"}</p>
        <p className="mt-2 text-xs text-steel">Status: {isConnected ? "Connected" : "Disconnected"}</p>
      </div>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-wide text-steel">Choose Role</p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setRole("brand")}
            className={`rounded-lg px-4 py-2 text-sm ${role === "brand" ? "bg-ink text-white" : "bg-mist text-steel"}`}
          >
            Brand
          </button>
          <button
            onClick={() => setRole("influencer")}
            className={`rounded-lg px-4 py-2 text-sm ${
              role === "influencer" ? "bg-ink text-white" : "bg-mist text-steel"
            }`}
          >
            Influencer
          </button>
          <button
            disabled={!isAdminWallet}
            onClick={() => setRole("admin")}
            className={`rounded-lg px-4 py-2 text-sm ${role === "admin" ? "bg-ink text-white" : "bg-mist text-steel"} disabled:opacity-40`}
          >
            Admin
          </button>
        </div>
      </div>
    </section>
  );
}
