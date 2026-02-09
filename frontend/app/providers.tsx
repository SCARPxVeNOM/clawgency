"use client";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { SessionProvider } from "@/context/SessionContext";
import { TransactionLogProvider } from "@/context/TransactionLogContext";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <SessionProvider>
            <TransactionLogProvider>
              {children}
              <Toaster position="top-right" />
            </TransactionLogProvider>
          </SessionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
