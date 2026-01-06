"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ALL_TOOLS } from "@agent-protocol/core";
import { AgentProvider, ChatWidget } from "@agent-protocol/ai";
import Image from "next/image";

// Dynamically import Wallet components to avoid hydration errors
const ConnectWalletButton = dynamic(
  () => import("./components/ConnectWalletButton"),
  { ssr: false }
);

export default function Home() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [apiKey, setApiKey] = useState<string>("");
  // Connect to production API or local if debugging
  const BASE_URL = "http://localhost:3001";

  // Fetch a fresh session key from the API
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const res = await fetch(`${BASE_URL}/v1/key`, { method: "POST" });
        const data = await res.json();
        if (data.key) setApiKey(data.key);
      } catch (e) {
        console.error("Failed to fetch key", e);
      }
    };
    fetchKey();
  }, []);

  // Tool Handlers
  const handleGetBalance = async () => {
    if (!publicKey) return "Wallet not connected";
    const balance = await connection.getBalance(publicKey);
    return {
      sol: balance / 1e9,
      address: publicKey.toBase58()
    };
  };

  const handleTransferSOL = async (args: any) => {
    if (!publicKey) throw new Error("Wallet not connected");
    const { toAddress, amount } = args;

    // Import dynamically to avoid SSR issues if simple import fails, though usually SystemProgram is fine.
    const { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } = await import("@solana/web3.js");

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(toAddress),
        lamports: amount * LAMPORTS_PER_SOL
      })
    );

    const signature = await sendTransaction(transaction, connection);
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    return { signature, status: confirmation.value.err ? "failed" : "success" };
  };

  const handlers = {
    getBalance: handleGetBalance,
    transferSOL: handleTransferSOL,
  };

  if (!apiKey) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <AgentProvider apiKey={apiKey} baseUrl={BASE_URL}>
      <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
          <div className="flex gap-4 items-center flex-col sm:flex-row">
            <h1 className="text-4xl font-bold">Agent Protocol AI Chat</h1>
            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
              <ConnectWalletButton />
            </div>
          </div>

          <ul className="list-inside list-disc text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
            <li className="mb-2">
              Get started by connecting your wallet.
            </li>
            <li>
              Ask the agent to check your balance or send funds.
            </li>
          </ul>

          {!connected && (
            <p className="text-yellow-600 text-sm">Please connect your wallet to use the AI Agent.</p>
          )}

          {connected && (
            <p className="text-green-600 text-sm">Wallet connected! Use the chat widget below.</p>
          )}
        </main>

        {/* Chat Widget with Tools Enabled */}
        {connected && (
          <ChatWidget
            title="Solana Agent"
            themeColor="#9945FF"
            tools={ALL_TOOLS}
            handlers={handlers}
          />
        )}

        <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
          <a
            className="flex items-center gap-2 hover:underline hover:underline-offset-4"
            href="https://agentprotocol.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="w-4 h-4 bg-gray-500 rounded-full" /> {/* Placeholder for globe icon */}
            Go to agentprotocol.ai →
          </a>
        </footer>
      </div>
    </AgentProvider>
  );
}
