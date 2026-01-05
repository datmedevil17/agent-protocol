import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { sepolia } from "viem/chains";

// Re-exports for consumers
export { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction };
export { formatEther, parseEther };
export { sepolia } from "viem/chains";

// React Hooks Re-exports
export { useConnection, useWallet, ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
export { useAccount, useSendTransaction, useConnect, useSwitchChain } from "wagmi";
export { injected } from "wagmi/connectors";

export type TransactionParams = {
    to: string;
    value?: bigint;
    data?: string;
};

/**
 * Transfers SOL from the session keypair to a destination address.
 */
export async function transferSOL(
    connection: Connection,
    sessionKey: Keypair,
    toAddress: string,
    amount: number
): Promise<string> {
    try {
        const toPubkey = new PublicKey(toAddress);
        const lamports = amount * LAMPORTS_PER_SOL;

        const balance = await connection.getBalance(sessionKey.publicKey);
        if (balance < lamports) {
            throw new Error(`Insufficient funds. Available: ${balance / LAMPORTS_PER_SOL} SOL, Required: ${amount} SOL`);
        }

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: sessionKey.publicKey,
                toPubkey: toPubkey,
                lamports,
            })
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [sessionKey]
        );

        console.log("Transfer successful, signature:", signature);
        return signature;
    } catch (error) {
        console.error("Transfer failed:", error);
        throw error;
    }
}

/**
 * Transfers ETH from a private key to a destination address on Sepolia.
 */
export async function transferETH(
    privateKeyHex: string,
    toAddress: string,
    amount: number
): Promise<string> {
    try {
        const account = privateKeyToAccount(privateKeyHex as `0x${string}`);

        const client = createWalletClient({
            account,
            chain: sepolia,
            transport: http()
        });

        const hash = await client.sendTransaction({
            to: toAddress as `0x${string}`,
            value: parseEther(amount.toString())
        });

        console.log("ETH Transfer successful, hash:", hash);
        return hash;
    } catch (error) {
        console.error("ETH Transfer failed:", error);
        throw error;
    }
}

// Tool definition for Gemini API (SOL)
export const transferSOLTool = {
    name: "transferSOL",
    description: "Transfer SOL from the session wallet to another address. Use this when the user wants to send or transfer funds on Solana.",
    parameters: {
        type: "OBJECT",
        properties: {
            toAddress: {
                type: "STRING",
                description: "The destination Solana wallet address",
            },
            amount: {
                type: "NUMBER",
                description: "The amount of SOL to transfer",
            },
        },
        required: ["toAddress", "amount"],
    },
};

// Tool definition for Gemini API (ETH)
export const transferETHTool = {
    name: "transferETH",
    description: "Transfer ETH from the session wallet to another address. Use this when the user wants to send or transfer funds on Ethereum or Sepolia.",
    parameters: {
        type: "OBJECT",
        properties: {
            toAddress: {
                type: "STRING",
                description: "The destination Ethereum wallet address (0x...)",
            },
            amount: {
                type: "NUMBER",
                description: "The amount of ETH to transfer",
            },
        },
        required: ["toAddress", "amount"],
    },
};

// Tool definition for fetching balances
export const getBalanceTool = {
    name: "getBalance",
    description: "Get the current balance of the session wallet for both Solana (SOL) and Ethereum (ETH). Use this when the user asks 'how much do I have?' or 'what is my balance?'.",
    parameters: {
        type: "OBJECT",
        properties: {},
    },
};

/**
 * Executes a mock transaction for testing purposes.
 */
export async function executeTransaction(params: TransactionParams): Promise<{
    hash: string;
    totalCost: bigint;
}> {
    console.log('Executing mock transaction with params:', params);
    const gas = 21000n;
    const gasPrice = 1000000000n;
    const executionCost = gas * gasPrice;
    const value = params.value || 0n;
    const totalCost = executionCost + value;

    return {
        hash: '0xmockhash',
        totalCost
    };
}

// --- Session & Helper Logic ---

export interface SessionKeys {
    solKeypair: Keypair;
    solAddress: string;
    solSecret: number[];
    ethKey: string;
    ethAddress: string;
}

/**
 * Generate a fresh set of session keys.
 */
export function generateSessionKeys(): SessionKeys {
    // Solana
    const solKeypair = Keypair.generate();
    // Ethereum
    const ethKey = generatePrivateKey();
    const ethAccount = privateKeyToAccount(ethKey);

    return {
        solKeypair,
        solAddress: solKeypair.publicKey.toBase58(),
        solSecret: Array.from(solKeypair.secretKey),
        ethKey,
        ethAddress: ethAccount.address
    };
}

/**
 * Restore Solana keypair from secret key array.
 */
export function restoreSolanaKeypair(secretKey: number[]): Keypair {
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

/**
 * Restore ETH address from private key.
 */
export function getEthAddress(privateKey: string): string {
    return privateKeyToAccount(privateKey as `0x${string}`).address;
}

export interface SessionBalances {
    sol: number | null;
    eth: string | null;
}

/**
 * Fetch balances for both chains.
 */
export async function fetchSessionBalances(
    connection: Connection,
    solPublicKey: PublicKey | null,
    ethAddress: string | null
): Promise<SessionBalances> {
    let sol = null;
    let eth = null;

    // SOL
    if (solPublicKey) {
        try {
            const bal = await connection.getBalance(solPublicKey);
            sol = bal / LAMPORTS_PER_SOL;
        } catch (e) {
            // silent fail or log
        }
    }

    // ETH
    if (ethAddress) {
        try {
            const publicClient = createPublicClient({
                chain: sepolia,
                transport: http()
            });
            const bal = await publicClient.getBalance({ address: ethAddress as `0x${string}` });
            eth = formatEther(bal);
        } catch (e) {
            // silent fail
        }
    }

    return { sol, eth };
}

/**
 * Create a Solana transaction to fund the session wallet.
 */
export function createSolanaFundTransaction(
    fromPubkey: PublicKey,
    toPubkey: PublicKey,
    amountSol: number
): Transaction {
    return new Transaction().add(
        SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: amountSol * LAMPORTS_PER_SOL,
        })
    );
}
