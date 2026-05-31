import { Buffer } from "buffer";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";

// ── Types ──────────────────────────────────────────────────────────

/** Response shape from the Jupiter /quote endpoint. */
export interface JupiterQuoteResponse {
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
export interface JupiterSwapResponse {
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
export interface JupiterOptions {
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

// ── Defaults ───────────────────────────────────────────────────────

const DEFAULT_JUP_API = "https://quote-api.jup.ag/v6";
const DEFAULT_USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

// ── Functions ──────────────────────────────────────────────────────

/**
 * Fetch a swap quote from Jupiter.
 *
 * @param inputMint - The SPL token mint to swap FROM.
 * @param amount - Raw amount in smallest units (e.g. lamports for SOL).
 * @param options - Optional overrides.
 * @returns The Jupiter quote response.
 */
export async function getQuote(
  inputMint: string,
  amount: string,
  options?: JupiterOptions
): Promise<JupiterQuoteResponse> {
  const outputMint = options?.outputMint ?? DEFAULT_USDT_MINT;
  const slippageBps = options?.slippageBps ?? 50;
  const onlyDirectRoutes = options?.onlyDirectRoutes ?? false;
  const apiBase = options?.apiBase ?? DEFAULT_JUP_API;

  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: String(slippageBps),
    onlyDirectRoutes: String(onlyDirectRoutes),
  });

  const url = `${apiBase}/quote?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Jupiter quote error (${response.status}): ${response.statusText}${text ? ` \u2014 ${text}` : ""}`
    );
  }

  return response.json() as Promise<JupiterQuoteResponse>;
}

/**
 * Build a swap transaction using a quote obtained from `getQuote`.
 *
 * @param quoteResponse - The quote to execute.
 * @param userPublicKey - The wallet public key that will sign the tx.
 * @param options - Optional overrides.
 * @returns The swap transaction response containing the serialized tx.
 */
export async function getSwapTransaction(
  quoteResponse: JupiterQuoteResponse,
  userPublicKey: string,
  options?: JupiterOptions
): Promise<JupiterSwapResponse> {
  const wrapAndUnwrapSol = options?.wrapAndUnwrapSol ?? true;
  const prioritizationFeeLamports = options?.prioritizationFeeLamports ?? "auto";
  const dynamicComputeUnitLimit = options?.dynamicComputeUnitLimit ?? true;
  const apiBase = options?.apiBase ?? DEFAULT_JUP_API;

  const response = await fetch(`${apiBase}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol,
      dynamicComputeUnitLimit,
      prioritizationFeeLamports,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Jupiter swap error (${response.status}): ${response.statusText}${text ? ` \u2014 ${text}` : ""}`
    );
  }

  return response.json() as Promise<JupiterSwapResponse>;
}

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
export async function executeSwap(
  swapResponse: JupiterSwapResponse,
  keypair: Keypair,
  connection: Connection,
  options?: Pick<JupiterOptions, "commitment">
): Promise<string> {
  const commitment = options?.commitment ?? "confirmed";

  // Deserialize the versioned transaction from the base64-encoded wire format
  const txBuffer = Buffer.from(swapResponse.swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(txBuffer);

  // Sign with the user's keypair
  transaction.sign([keypair]);

  // Send the signed transaction
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false, maxRetries: 3 }
  );

  // Wait for confirmation
  const confirmation = await connection.confirmTransaction(
    signature,
    commitment
  );

  if (confirmation.value.err) {
    throw new Error(`Swap transaction failed: ${confirmation.value.err}`);
  }

  return signature;
}

/**
 * Get the current USD price of a token by requesting a 1-unit quote.
 *
 * @param mint - The SPL token mint.
 * @param options - Optional overrides.
 * @returns The price in USD, or `null` if unavailable.
 */
export async function getTokenPriceInUsd(
  mint: string,
  options?: JupiterOptions
): Promise<number | null> {
  try {
    const apiBase = options?.apiBase ?? DEFAULT_JUP_API;
    const quoteAmount = 10 ** 6; // 1 USDT unit
    const params = new URLSearchParams({
      inputMint: mint,
      outputMint: DEFAULT_USDT_MINT,
      amount: String(quoteAmount),
      slippageBps: "100",
      onlyDirectRoutes: "true",
    });

    const response = await fetch(`${apiBase}/quote?${params}`);
    if (!response.ok) return null;

    const data = (await response.json()) as JupiterQuoteResponse;
    // outAmount is in USDT units (6 decimals)
    return parseFloat(data.outAmount) / 1_000_000;
  } catch {
    return null;
  }
}

/**
 * Estimate the USD value of a token amount using Jupiter pricing.
 *
 * @param mint - The SPL token mint.
 * @param rawAmount - Raw amount string (includes decimals).
 * @param decimals - Number of decimal places for the token.
 * @param options - Optional overrides.
 * @returns The estimated USD value, or `null` if pricing is unavailable.
 */
export async function estimateValueInUsd(
  mint: string,
  rawAmount: string,
  decimals: number,
  options?: JupiterOptions
): Promise<number | null> {
  try {
    const price = await getTokenPriceInUsd(mint, options);
    if (price === null) return null;
    const amount = parseFloat(rawAmount) / 10 ** decimals;
    return amount * price;
  } catch {
    return null;
  }
}
