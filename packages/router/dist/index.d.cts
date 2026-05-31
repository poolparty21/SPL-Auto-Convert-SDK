import { Keypair, Connection } from '@solana/web3.js';

/** Response shape from the Jupiter /quote endpoint. */
interface JupiterQuoteResponse {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    otherAmountThreshold: string;
    priceImpactPct: string;
    routePlan: Array<{
        swapInfo: {
            label: string;
            inputMint: string;
            outputMint: string;
            inAmount: string;
            outAmount: string;
            feeAmount: string;
            feeMint: string;
        };
    }>;
}
/** Response shape from the Jupiter /swap endpoint. */
interface JupiterSwapResponse {
    swapTransaction: string;
    lastValidBlockHeight: number;
    prioritizationFeeLamports: number;
    computeUnitLimit: number;
    prioritizationType: {
        computeBudget: {
            microLamports: number;
            estimatedMicroLamports: number;
        };
    };
    dynamicSlippageReport: {
        slippageBps: number;
        otherAmount: number;
        simulatedIncurredSlippageBps: number;
    };
    simulationError: string | null;
}
/** Optional overrides for Jupiter API calls. */
interface JupiterOptions {
    /** Output token mint. Defaults to USDT (Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB). */
    outputMint?: string;
    /** Slippage tolerance in basis points. Default 50 (0.5 %). */
    slippageBps?: number;
    /** Only use direct routes (no multi-hop). Default false. */
    onlyDirectRoutes?: boolean;
    /** Wrap/unwrap native SOL automatically. Default true. */
    wrapAndUnwrapSol?: boolean;
    /** Priority fee in lamports. Use "auto" for automatic. */
    prioritizationFeeLamports?: string | number;
    /** Dynamically set compute unit limit. Default true. */
    dynamicComputeUnitLimit?: boolean;
    /** Jupiter API base URL override. */
    apiBase?: string;
    /** Commitment level for transaction confirmation. Default "confirmed". */
    commitment?: "processed" | "confirmed" | "finalized";
}
/**
 * Fetch a swap quote from Jupiter.
 *
 * @param inputMint - The SPL token mint to swap FROM.
 * @param amount - Raw amount in smallest units (e.g. lamports for SOL).
 * @param options - Optional overrides.
 * @returns The Jupiter quote response.
 */
declare function getQuote(inputMint: string, amount: string, options?: JupiterOptions): Promise<JupiterQuoteResponse>;
/**
 * Build a swap transaction using a quote obtained from `getQuote`.
 *
 * @param quoteResponse - The quote to execute.
 * @param userPublicKey - The wallet public key that will sign the tx.
 * @param options - Optional overrides.
 * @returns The swap transaction response containing the serialized tx.
 */
declare function getSwapTransaction(quoteResponse: JupiterQuoteResponse, userPublicKey: string, options?: JupiterOptions): Promise<JupiterSwapResponse>;
/**
 * Sign, send, and confirm a Jupiter swap transaction on-chain.
 *
 * This is a convenience wrapper that deserializes the swap transaction
 * from `getSwapTransaction`, signs it with the provided keypair, sends
 * it via the RPC connection, and waits for confirmation.
 *
 * @param swapResponse - The swap response from `getSwapTransaction`.
 * @param keypair - The Solana keypair that will sign the transaction.
 * @param connection - A Solana RPC connection.
 * @param options - Optional overrides (commitment level).
 * @returns The confirmed transaction signature (base58).
 */
declare function executeSwap(swapResponse: JupiterSwapResponse, keypair: Keypair, connection: Connection, options?: Pick<JupiterOptions, "commitment">): Promise<string>;
/**
 * Get the current USD price of a token by requesting a 1-unit quote.
 *
 * @param mint - The SPL token mint.
 * @param options - Optional overrides.
 * @returns The price in USD, or `null` if unavailable.
 */
declare function getTokenPriceInUsd(mint: string, options?: JupiterOptions): Promise<number | null>;
/**
 * Estimate the USD value of a token amount using Jupiter pricing.
 *
 * @param mint - The SPL token mint.
 * @param rawAmount - Raw amount string (includes decimals).
 * @param decimals - Number of decimal places for the token.
 * @param options - Optional overrides.
 * @returns The estimated USD value, or `null` if pricing is unavailable.
 */
declare function estimateValueInUsd(mint: string, rawAmount: string, decimals: number, options?: JupiterOptions): Promise<number | null>;

export { type JupiterOptions, type JupiterQuoteResponse, type JupiterSwapResponse, estimateValueInUsd, executeSwap, getQuote, getSwapTransaction, getTokenPriceInUsd };
