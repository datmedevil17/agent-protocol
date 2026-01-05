import { useState, useEffect, useRef } from "react";
// All imports now come from the core package
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
// All imports now come from the core package
import {
  // Wallet Hooks
  // useConnection, // Moved to direct import
  // useWallet, // Moved to direct import
  useAccount,
  useSendTransaction,
  useConnect,
  useSwitchChain,
  injected,

  // Types & Utils
  Keypair,
  Connection,
  parseEther, // Re-exported
  sepolia,

  // Core Agent Logic
  transferSOL,
  transferSOLTool,
  transferETH,
  transferETHTool,
  getBalanceTool,
  generateSessionKeys,
  restoreSolanaKeypair,
  getEthAddress,
  fetchSessionBalances,
  createSolanaFundTransaction,
  SessionBalances
} from "@agent-protocol/core";

interface AIAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: "user" | "agent";
  content: string;
}

export default function AIAgentModal({ isOpen, onClose }: AIAgentModalProps) {
  // Solana Hooks
  const { connection } = useConnection();
  const { publicKey: solPublicKey, sendTransaction: sendSolTransaction } = useWallet();

  // Ethereum Hooks
  const { address: ethAddress, isConnected: isEthConnected } = useAccount();
  const { sendTransaction: sendEthTransaction } = useSendTransaction();
  const { connect: connectEth } = useConnect();

  // State
  const [sessionKey, setSessionKey] = useState<Keypair | null>(null); // SOL Keypair
  const [ethSessionKey, setEthSessionKey] = useState<string | null>(null); // ETH Private Key Hex

  const [balance, setBalance] = useState<number | null>(null); // SOL Balance
  const [ethBalance, setEthBalance] = useState<string | null>(null); // ETH Balance

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Configurable funding amounts
  const [fundAmountSol, setFundAmountSol] = useState("0.05");
  const [fundAmountEth, setFundAmountEth] = useState("0.001");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Viem Public Client removed - using fetchSessionBalances via core

  // Load or generate session keys
  useEffect(() => {
    if (isOpen) {
      // SOL Session
      const storedKey = localStorage.getItem("ai_session_key");
      if (storedKey) {
        try {
          const secretKey = JSON.parse(storedKey); // Stored as number[]
          setSessionKey(restoreSolanaKeypair(secretKey));
        } catch (e) {
          generateNewSession();
        }
      } else {
        generateNewSession();
      }

      // ETH Session
      const storedEthKey = localStorage.getItem("ai_session_key_eth");
      if (storedEthKey) {
        setEthSessionKey(storedEthKey);
      } else {
        // If generateNewSession called above, it handles both. 
        // But if SOL existed and ETH didn't (migration), generate ETH.
        if (!storedKey) { /* already generated */ }
        else {
          const keys = generateSessionKeys();
          const newEthKey = keys.ethKey;
          setEthSessionKey(newEthKey);
          localStorage.setItem("ai_session_key_eth", newEthKey);
        }
      }
    }
  }, [isOpen]);

  // Fetch balances
  useEffect(() => {
    if (isOpen) {
      fetchBalances();
      const interval = setInterval(fetchBalances, 10000);
      return () => clearInterval(interval);
    }
  }, [sessionKey, ethSessionKey, isOpen, connection]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchBalances = async () => {
    const bals = await fetchSessionBalances(connection, sessionKey?.publicKey || null, ethSessionKey ? getEthAddress(ethSessionKey) : null);

    if (bals.sol !== null) setBalance(bals.sol);
    if (bals.eth !== null) setEthBalance(bals.eth);

    return bals;
  };

  const generateNewSession = () => {
    const keys = generateSessionKeys();

    // Solana
    setSessionKey(keys.solKeypair);
    localStorage.setItem("ai_session_key", JSON.stringify(keys.solSecret));

    // Ethereum
    setEthSessionKey(keys.ethKey);
    localStorage.setItem("ai_session_key_eth", keys.ethKey);

    setMessages([{ role: "agent", content: "Session initialized (SOL + ETH). How can I help you?" }]);
  };

  const handleRevokeSession = async () => {
    const confirmRevoke = window.confirm("Are you sure? This will refund remaining funds to your connected wallet and delete the session.");
    if (!confirmRevoke) return;

    // Refund SOL
    if (sessionKey && solPublicKey) {
      try {
        const balObj = await fetchSessionBalances(connection, sessionKey.publicKey, null);
        const currentSol = balObj.sol || 0;
        const fee = 0.000005; // 5000 lamports approx
        if (currentSol > fee) {
          setMessages(prev => [...prev, { role: "agent", content: "Refunding SOL..." }]);
          const amountToRefund = currentSol - fee;
          // Use core transferSOL which signs with sessionKey
          const signature = await transferSOL(connection, sessionKey, solPublicKey.toBase58(), amountToRefund);
          console.log("Returned SOL to main wallet:", signature);
        }
      } catch (e) {
        console.error("Failed to refund SOL", e);
      }
    }

    // Refund ETH
    if (ethSessionKey && ethAddress && isEthConnected) {
      try {
        const balObj = await fetchSessionBalances(connection, null, getEthAddress(ethSessionKey));
        const currentEth = parseFloat(balObj.eth || "0");
        // Simple mock estimation or use a fixed buffer. 
        // transferETH in core will handle standard transfer gas, but we need to subtract it from amount.
        // Core transferETH takes inclusive amount? No, it takes amount to send.
        // Managing gas subtraction exact is hard without viem here.
        // Let's assume a safe buffer.
        const costConfig = 0.0001; // ~21000 gas at moderate price

        if (currentEth > costConfig) {
          setMessages(prev => [...prev, { role: "agent", content: "Refunding ETH..." }]);
          const amountToRefund = currentEth - costConfig;
          const hash = await transferETH(ethSessionKey, ethAddress, amountToRefund);
          console.log("Returned ETH to main wallet:", hash);
        }
      } catch (e) {
        console.error("Failed to refund ETH", e);
      }
    }

    localStorage.removeItem("ai_session_key");
    localStorage.removeItem("ai_session_key_eth");
    setSessionKey(null);
    setEthSessionKey(null);
    setBalance(null);
    setEthBalance(null);
    setMessages([]);
    onClose();
  };

  const handleFundSessionSOL = async () => {
    if (!solPublicKey || !sessionKey) return;
    setIsFunding(true);
    try {
      const transaction = createSolanaFundTransaction(
        solPublicKey,
        sessionKey.publicKey,
        parseFloat(fundAmountSol)
      );

      const signature = await sendSolTransaction(transaction, connection);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
      await fetchBalances();
      setMessages(prev => [...prev, { role: "agent", content: `Received ${fundAmountSol} SOL.` }]);
    } catch (e) {
      console.error("SOL Funding failed", e);
    } finally {
      setIsFunding(false);
    }
  };

  const { switchChain } = useSwitchChain();
  const { chain } = useAccount();

  const handleFundSessionETH = async () => {
    if (!ethAddress || !ethSessionKey) {
      connectEth({ connector: injected() });
      return;
    }

    // Check if on Sepolia
    if (chain?.id !== sepolia.id) {
      try {
        switchChain({ chainId: sepolia.id });
        return; // Return so user can click again after switching
      } catch (e) {
        console.error("Failed to switch chain", e);
        alert("Please switch your wallet to Sepolia Testnet manually.");
        return;
      }
    }

    setIsFunding(true);
    try {
      const sessionAddress = getEthAddress(ethSessionKey);
      sendEthTransaction({
        to: sessionAddress as `0x${string}`,
        value: parseEther(fundAmountEth),
      }, {
        onSuccess: () => {
          setMessages(prev => [...prev, { role: "agent", content: `Transaction sent for ${fundAmountEth} ETH.` }]);
          // Balance update might take a moment
          setTimeout(fetchBalances, 5000);
        }
      });
    } catch (e) {
      console.error("ETH Funding failed", e);
    } finally {
      setIsFunding(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);
    console.log("API Key present:", !!process.env.NEXT_PUBLIC_GEMINI_API_KEY); // DEBUG

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages((prev) => [...prev, { role: "agent", content: "Error: No API Key configured." }]);
        setIsProcessing(false);
        return;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userMsg.content }] }],
            tools: [{ functionDeclarations: [transferSOLTool, transferETHTool, getBalanceTool] }],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`API Error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0]?.content?.parts?.[0];

      if (candidate?.functionCall) {
        const fc = candidate.functionCall;

        // SOL Transfer
        if (fc.name === "transferSOL") {
          const { toAddress, amount } = fc.args;
          setMessages((prev) => [...prev, { role: "agent", content: `Processing SOL transfer of ${amount} to ${toAddress}...` }]);
          try {
            if (!sessionKey) throw new Error("No SOL session key");
            const signature = await transferSOL(connection, sessionKey, toAddress, amount);
            setMessages((prev) => [...prev, { role: "agent", content: `SOL Transfer successful! Sig: ${signature}` }]);
            fetchBalances();
          } catch (e: any) {
            setMessages((prev) => [...prev, { role: "agent", content: `SOL Transfer failed: ${e.message}` }]);
          }
        }

        // ETH Transfer
        else if (fc.name === "transferETH") {
          const { toAddress, amount } = fc.args;
          setMessages((prev) => [...prev, { role: "agent", content: `Processing ETH transfer of ${amount} to ${toAddress}...` }]);
          try {
            if (!ethSessionKey) throw new Error("No ETH session key");
            const hash = await transferETH(ethSessionKey, toAddress, amount);
            setMessages((prev) => [...prev, { role: "agent", content: `ETH Transfer successful! Hash: ${hash}` }]);
            fetchBalances();
          } catch (e: any) {
            setMessages((prev) => [...prev, { role: "agent", content: `ETH Transfer failed: ${e.message}` }]);
          }
        }

        // Get Balance
        else if (fc.name === "getBalance") {
          setMessages((prev) => [...prev, { role: "agent", content: "Checking balances..." }]);
          const { sol, eth } = await fetchBalances();

          const solBal = sol !== null ? `${sol} SOL` : "Unknown SOL";
          const ethBal = eth !== null ? `${eth} ETH` : "Unknown ETH";
          setMessages((prev) => [...prev, { role: "agent", content: `Current Balance:\nSolana (Devnet): ${solBal}\nEthereum (Sepolia): ${ethBal}` }]);
        }

      } else {
        const aiText = candidate?.text || "Sorry, I couldn't understand that.";
        setMessages((prev) => [...prev, { role: "agent", content: aiText }]);
      }
    } catch (error: any) {
      console.error("Full Error Object:", error);
      setMessages((prev) => [...prev, { role: "agent", content: `Error: ${error.message || "Unknown error"}` }]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Helper to format ETH address
  const ethAddressDisplay = ethSessionKey ? getEthAddress(ethSessionKey) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              {/* SOL Info */}
              <div>
                <h3 className="text-sm font-bold text-blue-500">Solana (Devnet)</h3>
                {sessionKey && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      {sessionKey.publicKey.toBase58().slice(0, 6)}...{sessionKey.publicKey.toBase58().slice(-6)}
                    </p>
                    <p className="text-xs font-medium dark:text-white">
                      {balance !== null ? `${balance.toFixed(4)} SOL` : "..."}
                    </p>
                  </div>
                )}
              </div>

              {/* ETH Info */}
              <div>
                <h3 className="text-sm font-bold text-purple-500">Ethereum (Sepolia)</h3>
                {ethSessionKey && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                      {ethAddressDisplay.slice(0, 6)}...{ethAddressDisplay.slice(-4)}
                    </p>
                    <p className="text-xs font-medium dark:text-white">
                      {ethBalance !== null ? `${parseFloat(ethBalance).toFixed(4)} ETH` : "..."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
              {/* Action Buttons */}
              <div className="flex gap-2 items-center">
                {solPublicKey && (
                  <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-700 rounded overflow-hidden">
                    <input
                      type="text"
                      value={fundAmountSol}
                      onChange={(e) => setFundAmountSol(e.target.value)}
                      className="w-12 px-1 text-xs bg-transparent outline-none text-center"
                      placeholder="SOL"
                    />
                    <button
                      onClick={handleFundSessionSOL}
                      disabled={isFunding}
                      className="text-xs bg-blue-600 text-white font-medium px-2 py-1.5 hover:bg-blue-700 disabled:opacity-50"
                    >
                      Fund
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-700 rounded overflow-hidden">
                  <input
                    type="text"
                    value={fundAmountEth}
                    onChange={(e) => setFundAmountEth(e.target.value)}
                    className="w-12 px-1 text-xs bg-transparent outline-none text-center"
                    placeholder="ETH"
                  />
                  <button
                    onClick={handleFundSessionETH}
                    disabled={isFunding}
                    className="text-xs bg-purple-600 text-white font-medium px-2 py-1.5 hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isEthConnected ? "Fund" : "Connect"}
                  </button>
                </div>

                <button
                  onClick={handleRevokeSession}
                  className="text-xs text-red-500 border border-red-200 px-2 py-1.5 rounded hover:bg-red-50 dark:border-red-900/30"
                >
                  Revoke
                </button>
              </div>
              <p className="text-[10px] text-zinc-400">Default: 0.05 SOL / 0.001 ETH</p>
            </div>

            <button onClick={onClose} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-200">
              ✕
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-2">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === "user"
                  ? "bg-zinc-800 text-white rounded-br-none"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-none border border-zinc-200 dark:border-zinc-700"
                  }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isProcessing && <div className="text-xs text-zinc-500 animate-pulse ml-2">Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type 'Transfer 0.0001 ETH to...'"
            className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-4 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:text-white"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
