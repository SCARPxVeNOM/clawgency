"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { HeroUIProvider } from "@heroui/react";
import { Toaster } from "react-hot-toast";
import { wagmiConfig } from "@/lib/wagmi";
import { SessionProvider } from "@/context/SessionContext";
import { TransactionLogProvider } from "@/context/TransactionLogContext";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <HeroUIProvider>
            <SessionProvider>
              <TransactionLogProvider>
                {children}
                <Toaster position="bottom-right" />
              </TransactionLogProvider>
            </SessionProvider>
          </HeroUIProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
