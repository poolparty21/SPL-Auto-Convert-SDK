// src/index.ts
import { Buffer } from "buffer";
import { VersionedTransaction } from "@solana/web3.js";
var DEFAULT_JUP_API = "https://quote-api.jup.ag/v6";
var DEFAULT_USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
async function getQuote(inputMint, amount, options) {
  const outputMint = options?.outputMint ?? DEFAULT_USDT_MINT;
  const slippageBps = options?.slippageBps ?? 50;
  const onlyDirectRoutes = options?.onlyDirectRoutes ?? false;
  const apiBase = options?.apiBase ?? DEFAULT_JUP_API;
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: String(slippageBps),
    onlyDirectRoutes: String(onlyDirectRoutes)
  });
  const url = `${apiBase}/quote?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Jupiter quote error (${response.status}): ${response.statusText}${text ? ` \u2014 ${text}` : ""}`
    );
  }
  return response.json();
}
async function getSwapTransaction(quoteResponse, userPublicKey, options) {
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
      prioritizationFeeLamports
    })
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Jupiter swap error (${response.status}): ${response.statusText}${text ? ` \u2014 ${text}` : ""}`
    );
  }
  return response.json();
}
async function executeSwap(swapResponse, keypair, connection, options) {
  const commitment = options?.commitment ?? "confirmed";
  const txBuffer = Buffer.from(swapResponse.swapTransaction, "base64");
  const transaction = VersionedTransaction.deserialize(txBuffer);
  transaction.sign([keypair]);
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false, maxRetries: 3 }
  );
  const confirmation = await connection.confirmTransaction(
    signature,
    commitment
  );
  if (confirmation.value.err) {
    throw new Error(`Swap transaction failed: ${confirmation.value.err}`);
  }
  return signature;
}
async function getTokenPriceInUsd(mint, options) {
  try {
    const apiBase = options?.apiBase ?? DEFAULT_JUP_API;
    const quoteAmount = 10 ** 6;
    const params = new URLSearchParams({
      inputMint: mint,
      outputMint: DEFAULT_USDT_MINT,
      amount: String(quoteAmount),
      slippageBps: "100",
      onlyDirectRoutes: "true"
    });
    const response = await fetch(`${apiBase}/quote?${params}`);
    if (!response.ok) return null;
    const data = await response.json();
    return parseFloat(data.outAmount) / 1e6;
  } catch {
    return null;
  }
}
async function estimateValueInUsd(mint, rawAmount, decimals, options) {
  try {
    const price = await getTokenPriceInUsd(mint, options);
    if (price === null) return null;
    const amount = parseFloat(rawAmount) / 10 ** decimals;
    return amount * price;
  } catch {
    return null;
  }
}
export {
  estimateValueInUsd,
  executeSwap,
  getQuote,
  getSwapTransaction,
  getTokenPriceInUsd
};
//# sourceMappingURL=index.js.map