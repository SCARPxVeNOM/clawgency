import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bsc, bscTestnet } from "viem/chains";
import { http } from "wagmi";

const useTestnet = (process.env.NEXT_PUBLIC_USE_TESTNET ?? "true") === "true";
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "replace-with-project-id";
const testnetRpc =
  process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ?? "https://data-seed-prebsc-1-s1.bnbchain.org:8545";
const mainnetRpc =
  process.env.NEXT_PUBLIC_BSC_MAINNET_RPC_URL ?? "https://bsc-dataseed.binance.org";

const activeChain = useTestnet ? bscTestnet : bsc;

export const wagmiConfig = getDefaultConfig({
  appName: "Clawgency Slot 2",
  projectId: walletConnectProjectId,
  chains: [activeChain],
  transports: {
    [bscTestnet.id]: http(testnetRpc),
    [bsc.id]: http(mainnetRpc)
  },
  ssr: true
});

export { activeChain };
