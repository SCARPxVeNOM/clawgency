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
            <div className="content-grid">
              <div className="space-y-5">
                {children}
              </div>
              <aside className="lg:sticky lg:top-6">
                <TransactionLogger />
              </aside>
            </div>
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
