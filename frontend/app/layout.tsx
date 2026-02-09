import type { Metadata } from "next";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/AppShell";
import { TransactionLogger } from "@/components/TransactionLogger";

export const metadata: Metadata = {
  title: "Clawgency Slot 2",
  description: "Professional AI-powered on-chain influencer agency on BNB Chain"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div>{children}</div>
              <aside>
                <TransactionLogger />
              </aside>
            </div>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
