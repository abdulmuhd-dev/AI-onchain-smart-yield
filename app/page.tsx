"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  ConnectButton,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { http, parseUnits } from "viem";
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
import { yieldABI } from "@/lib/abi/yieldABI";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Amiko } from "next/font/google";
import { readContract } from "viem/actions";

const config = getDefaultConfig({
  appName: "AI smart yield",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(
      "https://sepolia.infura.io/v3/cae6eccc47544f2889b6e7f418521a31"
    ),
  },
  wallets: [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, rabbyWallet, walletConnectWallet, okxWallet],
    },
  ],
});

const queryClient = new QueryClient();

const CONTRACT_ADDRESS: Address = "0x2adB3b4e8B944B9d02Fa7B96DEF2a19d2473A89d";

const ABI = yieldABI;

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
  const { writeContractAsync, isPending } = useWriteContract();
  const [amount, setAmount] = useState("");

  const { data: staked, refetch: refetchStaked } = useReadContract({
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
    query: {
      refetchInterval: 3000,
    },
  });

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    abi: ABI,
    address: CONTRACT_ADDRESS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const handleStaking = async (functionName: string) => {
    const amt = parseUnits(amount, 18);
    if (functionName !== "unstake") {
      const approveHash = await writeContractAsync({
        abi: ABI,
        address: CONTRACT_ADDRESS,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, amt],
      });
      await waitForTransactionReceipt(config, {
        hash: approveHash,
      });
    }

    const hash = await writeContractAsync({
      abi: ABI,
      address: CONTRACT_ADDRESS,
      functionName,
      args: [amt],
    });
    await waitForTransactionReceipt(config, { hash });
    await refetchBalance();
    await refetchStaked();
  };

  const handleClaimRewards = async () => {
    const hash = await writeContractAsync({
      abi: ABI,
      address: CONTRACT_ADDRESS,
      functionName: "claimRewards",
    });
  };

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
            {(Number(tokenBalance) / 1e18).toFixed(4) || "0"} YIELD
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
          color: "black",
        }}
      />

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={() => handleStaking("stake")}
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
          onClick={() => handleStaking("unstake")}
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
          onClick={() => handleClaimRewards()}
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
