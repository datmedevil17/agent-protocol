import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

const JUP_API = "https://quote-api.jup.ag/v6";

export interface QuoteResponse {
    inputMint: string;
    inAmount: string;
    outputMint: string;
    outAmount: string;
    otherAmountThreshold: string;
    swapMode: string;
    slippageBps: number;
    platformFee: any;
    priceImpactPct: string;
    routePlan: any[];
    contextSlot: number;
    timeTaken: number;
}

export class JupiterService {
    constructor(private connection: Connection) { }

    /**
     * Fetch a quote from Jupiter Aggregator.
     * Checks for safety features like max price impact.
     */
    async getQuote(
        inputMint: string,
        outputMint: string,
        amount: number, // In integer units (lamports/atomic units)
        slippageBps: number = 50, // 0.5%
        maxPriceImpactPct: number = 2.0 // Safety guardrail
    ): Promise<QuoteResponse> {
        const url = `${JUP_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Jupiter Quote API Error: ${error.error || response.statusText}`);
            }

            const quote: QuoteResponse = await response.json();

            // Safety Check: Price Impact
            if (parseFloat(quote.priceImpactPct) > maxPriceImpactPct) {
                throw new Error(`Safety Alert: Price impact is ${quote.priceImpactPct}%, which exceeds the safety limit of ${maxPriceImpactPct}%. transaction aborted.`);
            }

            return quote;
        } catch (error) {
            console.error("Jupiter Quote Failed:", error);
            throw error;
        }
    }

    /**
     * Get the serialized swap transaction from Jupiter.
     */
    async getSwapTransaction(
        quoteResponse: QuoteResponse,
        userPublicKey: string // Base58 string
    ): Promise<string> {
        try {
            const response = await fetch(`${JUP_API}/swap`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quoteResponse,
                    userPublicKey,
                    wrapAndUnwrapSol: true,
                    // Optimization: dynamicComputeUnitLimit usually yields better success rates
                    dynamicComputeUnitLimit: true,
                    prioritizationFeeLamports: "auto",
                }),
            });

            if (!response.ok) throw new Error("Jupiter Swap API Error");

            const { swapTransaction } = await response.json();
            return swapTransaction;
        } catch (error) {
            console.error("Jupiter Swap API Failed:", error);
            throw error;
        }
    }

    /**
     * Helper to deserialize and execute the transaction.
     * Note: This usually runs on the client where the wallet is available.
     */
    async deserializeTransaction(swapTransactionBase64: string) {
        return VersionedTransaction.deserialize(Buffer.from(swapTransactionBase64, 'base64'));
    }

    /**
     * Resolve token symbol to Mint Address and Decimals.
     * In a real package, this would fetch from Jupiter Token List API.
     */
    async getTokenInfo(symbol: string): Promise<{ mint: string; decimals: number } | null> {
        const TOKENS: Record<string, { mint: string; decimals: number }> = {
            "SOL": { mint: "So11111111111111111111111111111111111111112", decimals: 9 },
            "USDC": { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 },
            "USDT": { mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 },
            "JUP": { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtkOpSDV1c124MG2UCz", decimals: 6 },
        };

        return TOKENS[symbol.toUpperCase()] || null;
    }
}
