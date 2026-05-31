"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  estimateValueInUsd: () => estimateValueInUsd,
  executeSwap: () => executeSwap,
  getQuote: () => getQuote,
  getSwapTransaction: () => getSwapTransaction,
  getTokenPriceInUsd: () => getTokenPriceInUsd
});
module.exports = __toCommonJS(index_exports);
var import_buffer = require("buffer");
var import_web3 = require("@solana/web3.js");
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
  const txBuffer = import_buffer.Buffer.from(swapResponse.swapTransaction, "base64");
  const transaction = import_web3.VersionedTransaction.deserialize(txBuffer);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  estimateValueInUsd,
  executeSwap,
  getQuote,
  getSwapTransaction,
  getTokenPriceInUsd
});
//# sourceMappingURL=index.cjs.map