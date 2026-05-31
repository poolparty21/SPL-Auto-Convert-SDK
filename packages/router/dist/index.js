import { JUP_API_BASE, USDT_MINT } from '@kololabs/core';

// src/jupiter.ts
async function getQuote(inputMint, amount, slippageBps = 50) {
  const url = `${JUP_API_BASE}/quote?inputMint=${inputMint}&outputMint=${USDT_MINT}&amount=${amount}&slippageBps=${slippageBps}&onlyDirectRoutes=false`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Jupiter quote error: ${response.statusText}`);
  }
  return await response.json();
}
async function getSwapTransaction(quoteResponse, userPublicKey) {
  const response = await fetch(`${JUP_API_BASE}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
      prioritizationFeeLamports: "auto"
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Jupiter swap error: ${errorText}`);
  }
  return await response.json();
}
async function getTokenPriceInUsd(mint) {
  try {
    const response = await fetch(
      `${JUP_API_BASE}/quote?inputMint=${mint}&outputMint=${USDT_MINT}&amount=${10 ** 6}&slippageBps=100&onlyDirectRoutes=true`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return parseFloat(data.outAmount) / 1e6;
  } catch {
    return null;
  }
}
async function estimateValueInUsd(mint, rawAmount, decimals) {
  try {
    const price = await getTokenPriceInUsd(mint);
    if (price === null) return null;
    const amount = parseFloat(rawAmount) / 10 ** decimals;
    return amount * price;
  } catch {
    return null;
  }
}

export { estimateValueInUsd, getQuote, getSwapTransaction, getTokenPriceInUsd };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map