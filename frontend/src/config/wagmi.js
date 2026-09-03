// config/wagmi.js
import { createConfig, http } from "wagmi";
import { mainnet, sepolia, hardhat, localhost } from "wagmi/chains";
import {
  injected,
  walletConnect,
  coinbaseWallet,
  metaMask,
} from "wagmi/connectors";

// Replace with your WalletConnect project ID from https://cloud.walletconnect.com
const projectId = "YOUR_WALLET_CONNECT_PROJECT_ID";

export const wagmiConfig = createConfig({
  chains: [
    mainnet, // Ethereum mainnet
    sepolia, // Sepolia testnet
    // hardhat,  // Uncomment if using Hardhat local network
    // localhost // Uncomment if using local blockchain
  ],
  connectors: [
    injected(), // MetaMask, Brave Wallet, etc.
    metaMask(), // Specifically MetaMask
    walletConnect({
      projectId,
      metadata: {
        name: "Your Healthcare App",
        description: "Healthcare platform with blockchain integration",
        url: "https://your-domain.com",
        icons: ["https://your-domain.com/icon.png"],
      },
    }),
    coinbaseWallet({
      appName: "Your Healthcare App",
      appLogoUrl: "https://your-domain.com/icon.png",
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    // [hardhat.id]: http(), // Uncomment if using Hardhat
    // [localhost.id]: http(), // Uncomment if using localhost
  },
});

// Query client for TanStack Query (required by wagmi)
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});
