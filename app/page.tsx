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
          <div className="min-h-screen bg-zinc-950 text-white p-6">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-bold text-center mb-1">
                🌾 AI Smart Yield Optimizer
              </h1>
              <p className="text-center text-zinc-400 mb-8">
                Stake YIELD • Earn Rewards • Get AI Advice
              </p>

              <ConnectButton />

              <StakingUI />
            </div>
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
  const [isLoading, setIsLoading] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([
    {
      role: "ai",
      content:
        "Hi! I'm your AI yield assistant. Ask me anything about staking, rewards, or strategy.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

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

  const handleAction = async (action: "stake" | "unstake" | "claim") => {
    if (!address || amount === "" || isNaN(amount)) return;
    setIsLoading(true);

    try {
      let hash;
      const amt = parseUnits(amount || "0", 18);

      if (action === "stake") {
        const approveHash = await writeContractAsync({
          abi: ABI,
          address: CONTRACT_ADDRESS,
          functionName: "approve",
          args: [CONTRACT_ADDRESS, amt],
        });
        await waitForTransactionReceipt(config, { hash: approveHash });
      }

      hash = await writeContractAsync({
        abi: ABI,
        address: CONTRACT_ADDRESS,
        functionName: action === "claim" ? "claimRewards" : action,
        args: action === "claim" ? undefined : [amt],
      });

      await waitForTransactionReceipt(config, { hash });

      alert(`${action.toUpperCase()} was successful!`);
      setAmount("");
      await refetchBalance();
      await refetchStaked();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { role: "user", content: chatInput }]);
    const msg = chatInput;
    setChatInput("");
    try {
      const apiUrl = "https://7dcykx-4000.csb.app/";
      const options = {
        method: "POST",
        header: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_input: msg,
        }),
      };
      const resp = await fetch(apiUrl);
      const AIResp = await resp.json();
      window.alert(AIResp);
      setChatMessages((prev) => [...prev, AIResp]);
    } catch (e) {
      window.alert(e);
      console.log(e);
    }
  };

  if (!address) {
    return (
      <p className="text-center mt-12 text-xl text-zinc-400">
        Connect your wallet to start staking
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Staking Card */}
      <div className="bg-zinc-900 rounded-3xl p-8">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-zinc-400 text-sm">Balance</p>
            <p className="text-2xl font-semibold mt-1">
              {tokenBalance ? (Number(tokenBalance) / 1e18).toFixed(4) : "0"}{" "}
              YIELD
            </p>
          </div>
          <div>
            <p className="text-zinc-400 text-sm">Staked</p>
            <p className="text-2xl font-semibold mt-1">
              {staked ? (Number(staked) / 1e18).toFixed(4) : "0"} YIELD
            </p>
          </div>
          <div>
            <p className="text-zinc-400 text-sm">Rewards</p>
            <p className="text-2xl font-semibold text-emerald-400 mt-1">
              {pendingRewards
                ? (Number(pendingRewards) / 1e18).toFixed(4)
                : "0"}{" "}
              YIELD
            </p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full mt-8 bg-zinc-800 text-white rounded-2xl px-6 py-5 text-lg outline-none"
        />

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => handleAction("stake")}
            disabled={isLoading}
            className="flex-1 bg-white text-black font-semibold py-4 rounded-2xl hover:bg-zinc-100 transition"
          >
            {isLoading ? "Processing..." : "Stake"}
          </button>
          <button
            onClick={() => handleAction("unstake")}
            disabled={isLoading}
            className="flex-1 bg-zinc-800 font-semibold py-4 rounded-2xl hover:bg-zinc-700 transition"
          >
            {isLoading ? "Processing..." : "Unstake"}
          </button>
          <button
            onClick={() => handleAction("claim")}
            disabled={isLoading}
            className="flex-1 bg-emerald-500 font-semibold py-4 rounded-2xl hover:bg-emerald-600 transition"
          >
            {isLoading ? "Processing..." : "Claim"}
          </button>
        </div>
      </div>

      {/* AI Chat Box */}
      <div className="bg-zinc-900 rounded-3xl p-6">
        <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
          🤖 AI Yield Assistant
        </h3>

        <div className="h-80 overflow-y-auto bg-zinc-950 rounded-2xl p-5 space-y-4 mb-4">
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] px-5 py-3 rounded-3xl ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-100"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendChat()}
            placeholder="Ask AI about staking strategy..."
            className="flex-1 bg-zinc-800 text-white rounded-3xl px-6 py-4 outline-none text-base"
          />
          <button
            onClick={sendChat}
            className="bg-blue-600 hover:bg-blue-700 px-8 rounded-3xl font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
