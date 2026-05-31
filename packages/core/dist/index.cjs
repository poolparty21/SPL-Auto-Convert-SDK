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
  createEngine: () => createEngine
});
module.exports = __toCommonJS(index_exports);
var import_web3 = require("@solana/web3.js");
var import_listener = require("@kololabs/listener");
var import_router = require("@kololabs/router");
var import_gas = require("@kololabs/gas");
var SOL_MINT = "So11111111111111111111111111111111111111112";
function createEngine(config) {
  const {
    rpcUrl,
    walletAddress,
    targetMint,
    minimumBalanceSol = 0.1,
    targetBalanceSol,
    slippageBps = 50,
    signer,
    onSwapComplete,
    onError
  } = config;
  const connection = new import_web3.Connection(rpcUrl);
  const gasManager = (0, import_gas.createGasManager)({
    rpcUrl,
    walletAddress,
    minimumBalanceSol,
    targetBalanceSol: targetBalanceSol ? Number(targetBalanceSol) : void 0
  });
  let currentSlippageBps = slippageBps;
  async function attemptSwap(transfer, slippage) {
    const jupOptions = {
      outputMint: targetMint,
      slippageBps: slippage
    };
    const quote = await (0, import_router.getQuote)(transfer.mint, transfer.amount, jupOptions);
    const swapData = await (0, import_router.getSwapTransaction)(quote, walletAddress, jupOptions);
    const txBuffer = Buffer.from(swapData.swapTransaction, "base64");
    const transaction = import_web3.VersionedTransaction.deserialize(txBuffer);
    const signature = await signer(transaction);
    const txSignature = await connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false, maxRetries: 3 }
    );
    const confirmation = await connection.confirmTransaction(
      txSignature,
      "confirmed"
    );
    if (confirmation.value.err) {
      throw new Error(
        `Swap transaction failed on-chain: ${confirmation.value.err}`
      );
    }
    return txSignature;
  }
  async function handleTransfer(transfer) {
    try {
      const gasStatus = await gasManager.checkBalance();
      if (transfer.mint === SOL_MINT) {
        const incomingAmount = parseFloat(transfer.amount) / 1e9;
        const needsTopUp = await gasManager.needsTopUp();
        if (needsTopUp) {
          return;
        }
      } else if (!gasStatus.hasEnoughGas) {
        onError?.(
          new Error(
            `Insufficient gas: ${gasStatus.currentBalance.toFixed(4)} SOL (minimum ${gasStatus.minimumBalance} SOL required)`
          )
        );
        return;
      }
      currentSlippageBps = slippageBps;
      try {
        const txSignature = await attemptSwap(transfer, currentSlippageBps);
        const outputAmount = parseFloat(transfer.amount) / 1e9;
        onSwapComplete?.({
          signature: txSignature,
          inputMint: transfer.mint,
          inputAmount: transfer.amount,
          outputMint: targetMint,
          outputAmount
        });
      } catch (firstError) {
        const retrySlippage = currentSlippageBps + 100;
        try {
          const txSignature = await attemptSwap(transfer, retrySlippage);
          onSwapComplete?.({
            signature: txSignature,
            inputMint: transfer.mint,
            inputAmount: transfer.amount,
            outputMint: targetMint,
            outputAmount: 0
            // Don't have the quote output amount here
          });
        } catch (retryError) {
          onError?.(
            retryError instanceof Error ? retryError : new Error(String(retryError))
          );
        }
      }
    } catch (err) {
      onError?.(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
  const listener = (0, import_listener.createListener)({
    rpcUrl,
    walletAddress,
    onTransfer: handleTransfer,
    onError: (err) => onError?.(err)
  });
  return {
    async start() {
      await listener.start();
    },
    async stop() {
      await listener.stop();
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createEngine
});
//# sourceMappingURL=index.cjs.map