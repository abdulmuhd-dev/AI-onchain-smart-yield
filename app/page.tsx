"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  ConnectButton,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { sepolia } from "viem/chains";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useBalance,
} from "wagmi";
import { Address } from "viem";
import "@rainbow-me/rainbowkit/styles.css";
import { useState } from "react";
import {
  metaMaskWallet,
  rabbyWallet,
  walletConnectWallet,
  okxWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { metaMask } from "wagmi/connectors";
const config = getDefaultConfig({
  appName: "AI smart yield",
  projectId: process.env.PROJECTID,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
  },
  wallets: [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rabbyWallet, walletConnectWallet, okxWallet],
    },
  ],
});

const queryClient = new QueryClient();

const CONTRACT_ADDRESS: Address = "0xa05074b5C753fa8eF358640Fe30d6c37E1257D8A";

const ABI = [
  {
    inputs: [],
    name: "getStaked",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "calculateRewards",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "unstake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default function Home() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div
            style={{
              padding: "40px",
              maxWidth: "600px",
              margin: "0 auto",
              fontFamily: "system-ui",
            }}
          >
            <h1 style={{ textAlign: "center", fontSize: "28px" }}>
              🌾 AI Smart Yield Optimizer
            </h1>
            <p
              style={{
                textAlign: "center",
                color: "#666",
                marginBottom: "30px",
              }}
            >
              Stake YIELD • Earn Rewards
            </p>
            <ConnectButton />
            <StakingUI />
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function StakingUI() {
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const [amount, setAmount] = useState("");

  const { data: staked } = useReadContract({
    abi: ABI,
    address: CONTRACT_ADDRESS,
    functionName: "getStaked",
    args: address ? [address] : undefined,
  });

  const { data: pendingRewards } = useReadContract({
    abi: ABI,
    address: CONTRACT_ADDRESS,
    functionName: "calculateRewards",
    args: address ? [address] : undefined,
  });

  const { data: tokenBalance } = useBalance({
    address,
    token: CONTRACT_ADDRESS,
  });

  if (!address) {
    return (
      <p style={{ textAlign: "center", marginTop: "60px", fontSize: "18px" }}>
        Connect your wallet to start staking
      </p>
    );
  }

  return (
    <div
      style={{
        marginTop: "40px",
        background: "#1a1a1a",
        padding: "30px",
        borderRadius: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div>
          <p style={{ color: "#888" }}>Balance</p>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>
            {tokenBalance?.formatted || "0"} YIELD
          </p>
        </div>
        <div>
          <p style={{ color: "#888" }}>Staked</p>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>
            {staked ? (Number(staked) / 1e18).toFixed(4) : "0"} YIELD
          </p>
        </div>
        <div>
          <p style={{ color: "#888" }}>Rewards</p>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "#22c55e" }}>
            {pendingRewards ? (Number(pendingRewards) / 1e18).toFixed(4) : "0"}{" "}
            YIELD
          </p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "8px",
          marginBottom: "20px",
          fontSize: "16px",
        }}
      />

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={() =>
            writeContract({
              abi: ABI,
              address: CONTRACT_ADDRESS,
              functionName: "stake",
              args: [BigInt(Number(amount) * 1e18)],
            })
          }
          disabled={isPending}
          style={{
            flex: 1,
            padding: "14px",
            fontSize: "16px",
            borderRadius: "8px",
          }}
        >
          Stake
        </button>

        <button
          onClick={() =>
            writeContract({
              abi: ABI,
              address: CONTRACT_ADDRESS,
              functionName: "unstake",
              args: [BigInt(Number(amount) * 1e18)],
            })
          }
          disabled={isPending}
          style={{
            flex: 1,
            padding: "14px",
            fontSize: "16px",
            borderRadius: "8px",
          }}
        >
          Unstake
        </button>

        <button
          onClick={() =>
            writeContract({
              abi: ABI,
              address: CONTRACT_ADDRESS,
              functionName: "claimRewards",
            })
          }
          disabled={isPending}
          style={{
            flex: 1,
            padding: "14px",
            fontSize: "16px",
            borderRadius: "8px",
          }}
        >
          Claim Rewards
        </button>
      </div>
    </div>
  );
}
