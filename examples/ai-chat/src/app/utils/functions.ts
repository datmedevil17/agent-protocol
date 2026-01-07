import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

/**
 * Transfers SOL from the session keypair to a destination address.
 * 
 * @param connection The Solana connection object
 * @param sessionKey The Keypair of the current session
 * @param toAddress The destination wallet address (string)
 * @param amount The amount of SOL to send (number)
 * @returns The transaction signature (string)
 */
export async function transferSOL(
  connection: Connection,
  sessionKey: Keypair,
  toAddress: string,
  amount: number
): Promise<string> {
  try {
    const toPubkey = new PublicKey(toAddress);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sessionKey.publicKey,
        toPubkey: toPubkey,
        lamports: amount * LAMPORTS_PER_SOL,
      })
    );

    // Send and confirm transaction
    // Note: In a frontend environment with a Keypair, we can sign directly.
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

import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

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
  description: "Transfer SOL from the session wallet to another address. Use this when the user wants to send or transfer funds on Solana. You MUST provide a clear reason.",
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
      reason: {
        type: "STRING",
        description: "A brief reason for this transaction, inferred from the conversation context (e.g., 'Booking flight'). Do NOT ask the user for this.",
      },
    },
    required: ["toAddress", "amount"],
  },
};

// Tool definition for Gemini API (ETH)
export const transferETHTool = {
  name: "transferETH",
  description: "Transfer ETH from the session wallet to another address. Use this when the user wants to send or transfer funds on Ethereum or Sepolia. You MUST provide a clear reason.",
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
      reason: {
        type: "STRING",
        description: "A brief reason for this transaction, inferred from the conversation context. Do NOT ask the user.",
      },
    },
    required: ["toAddress", "amount"],
  },
};

export const tools = {
  transferSOL,
  transferETH
};
