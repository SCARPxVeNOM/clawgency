"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

export type AppRole = "brand" | "influencer" | "admin";

type SessionContextValue = {
  role: AppRole;
  setRole: (nextRole: AppRole) => void;
  walletAddress?: `0x${string}`;
  isConnected: boolean;
  isAdminWallet: boolean;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const ROLE_STORAGE_KEY = "clawgency_role";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const adminWallet = (process.env.NEXT_PUBLIC_ADMIN_WALLET ?? "").toLowerCase();
  const isAdminWallet = Boolean(address && address.toLowerCase() === adminWallet && adminWallet);

  const [role, setRoleState] = useState<AppRole>("brand");

  useEffect(() => {
    const storedRole = window.localStorage.getItem(ROLE_STORAGE_KEY) as AppRole | null;
    if (storedRole === "brand" || storedRole === "influencer" || storedRole === "admin") {
      setRoleState(storedRole);
    } else if (isAdminWallet) {
      setRoleState("admin");
    }
  }, [isAdminWallet]);

  const setRole = (nextRole: AppRole) => {
    setRoleState(nextRole);
    window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
  };

  const value = useMemo(
    () => ({
      role,
      setRole,
      walletAddress: address,
      isConnected,
      isAdminWallet
    }),
    [role, address, isConnected, isAdminWallet]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}
