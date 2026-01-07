/**
 * Security Configuration for Agent Sessions
 */
export interface SessionConfig {
    maxSpendSOL: number;
    maxSpendETH: number;
    maxPerTxSOL: number;
    maxPerTxETH: number;
    allowedMerchantsSOL?: string[];
    allowedMerchantsETH?: string[];
}

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
    maxSpendSOL: 0.1,
    maxSpendETH: 0.01,
    maxPerTxSOL: 0.05,
    maxPerTxETH: 0.005,
};

export class SessionValidator {
    private spentSOL: number = 0;
    private spentETH: number = 0;

    constructor(private config: SessionConfig = DEFAULT_SESSION_CONFIG) { }

    public validateSOL(toAddress: string, amount: number): void {
        // 1. Check Merchant Allowlist (if configured)
        if (this.config.allowedMerchantsSOL && this.config.allowedMerchantsSOL.length > 0) {
            if (!this.config.allowedMerchantsSOL.includes(toAddress)) {
                throw new Error(`Security Blocked: Address ${toAddress} is not in the allowed list.`);
            }
        }

        // 2. Check Per-Transaction Limit
        if (amount > this.config.maxPerTxSOL) {
            throw new Error(`Security Blocked: Amount ${amount} SOL exceeds per-transaction limit of ${this.config.maxPerTxSOL}.`);
        }

        // 3. Check Total Session Limit
        if (this.spentSOL + amount > this.config.maxSpendSOL) {
            throw new Error(`Security Blocked: Session limit reached. Remaining: ${(this.config.maxSpendSOL - this.spentSOL).toFixed(4)} SOL.`);
        }
    }

    public validateETH(toAddress: string, amount: number): void {
        // 1. Check Allowlist
        if (this.config.allowedMerchantsETH && this.config.allowedMerchantsETH.length > 0) {
            if (!this.config.allowedMerchantsETH.includes(toAddress)) {
                throw new Error(`Security Blocked: Address ${toAddress} is not in the allowed list.`);
            }
        }

        // 2. Check Per-Transaction Limit
        if (amount > this.config.maxPerTxETH) {
            throw new Error(`Security Blocked: Amount ${amount} ETH exceeds per-transaction limit of ${this.config.maxPerTxETH}.`);
        }

        // 3. Check Total Limit
        if (this.spentETH + amount > this.config.maxSpendETH) {
            throw new Error(`Security Blocked: Session limit reached. Remaining: ${(this.config.maxSpendETH - this.spentETH).toFixed(4)} ETH.`);
        }
    }

    public addSpentSOL(amount: number) {
        this.spentSOL += amount;
    }

    public addSpentETH(amount: number) {
        this.spentETH += amount;
    }

    public getUsage() {
        return {
            spentSOL: this.spentSOL,
            spentETH: this.spentETH,
            remainingSOL: this.config.maxSpendSOL - this.spentSOL,
            remainingETH: this.config.maxSpendETH - this.spentETH
        };
    }
}
