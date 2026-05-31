import { JupiterQuoteResponse, JupiterSwapResponse } from '@kololabs/core';

declare function getQuote(inputMint: string, amount: string, slippageBps?: number): Promise<JupiterQuoteResponse>;
declare function getSwapTransaction(quoteResponse: JupiterQuoteResponse, userPublicKey: string): Promise<JupiterSwapResponse>;
declare function getTokenPriceInUsd(mint: string): Promise<number | null>;
declare function estimateValueInUsd(mint: string, rawAmount: string, decimals: number): Promise<number | null>;

export { estimateValueInUsd, getQuote, getSwapTransaction, getTokenPriceInUsd };
