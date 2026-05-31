import { JUP_API_BASE, USDT_MINT } from '@kololabs/core';
import type { JupiterQuoteResponse, JupiterSwapResponse } from '@kololabs/core';

export async function getQuote(
  inputMint: string,
  amount: string,
  slippageBps = 50,
): Promise<JupiterQuoteResponse> {
  const url = `${JUP_API_BASE}/quote?inputMint=${inputMint}&outputMint=${USDT_MINT}&amount=${amount}&slippageBps=${slippageBps}&onlyDirectRoutes=false`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Jupiter quote error: ${response.statusText}`);
  }

  return (await response.json()) as JupiterQuoteResponse;
}

export async function getSwapTransaction(
  quoteResponse: JupiterQuoteResponse,
  userPublicKey: string,
): Promise<JupiterSwapResponse> {
  const response = await fetch(`${JUP_API_BASE}/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      prioritizationFeeLamports: 'auto',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jupiter swap error: ${errorText}`);
  }

  return (await response.json()) as JupiterSwapResponse;
}

export async function getTokenPriceInUsd(mint: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${JUP_API_BASE}/quote?inputMint=${mint}&outputMint=${USDT_MINT}&amount=${10 ** 6}&slippageBps=100&onlyDirectRoutes=true`,
    );
    if (!response.ok) return null;
    const data = await response.json() as JupiterQuoteResponse;
    return parseFloat(data.outAmount) / 1_000_000;
  } catch {
    return null;
  }
}

export async function estimateValueInUsd(
  mint: string,
  rawAmount: string,
  decimals: number,
): Promise<number | null> {
  try {
    const price = await getTokenPriceInUsd(mint);
    if (price === null) return null;
    const amount = parseFloat(rawAmount) / 10 ** decimals;
    return amount * price;
  } catch {
    return null;
  }
}
