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
  createListener: () => createListener
});
module.exports = __toCommonJS(index_exports);
var import_web3 = require("@solana/web3.js");
var TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
function validateConfig(config) {
  if (!config.rpcUrl) throw new Error("rpcUrl is required");
  if (!config.walletAddress) throw new Error("walletAddress is required");
  if (typeof config.onTransfer !== "function")
    throw new Error("onTransfer callback is required");
  if (typeof config.onError !== "function")
    throw new Error("onError callback is required");
}
function isTokenTransferLog(logs) {
  const text = logs.join(" ");
  return text.includes(TOKEN_PROGRAM_ID) && /\bTransfer\b/i.test(text);
}
function createListener(config) {
  validateConfig(config);
  const connection = new import_web3.Connection(config.rpcUrl);
  const walletPk = new import_web3.PublicKey(config.walletAddress);
  const walletStr = config.walletAddress;
  let subId = null;
  async function handleLogs(logs, slot) {
    if (logs.err) return;
    if (!isTokenTransferLog(logs.logs)) return;
    try {
      const tx = await connection.getParsedTransaction(logs.signature, {
        maxSupportedTransactionVersion: 0
      });
      if (!tx?.meta) return;
      const pre = tx.meta.preTokenBalances ?? [];
      const post = tx.meta.postTokenBalances ?? [];
      for (const postBalance of post) {
        const preBalance = pre.find(
          (p) => p.accountIndex === postBalance.accountIndex
        );
        if (!preBalance) continue;
        const preAmt = BigInt(preBalance.uiTokenAmount.amount);
        const postAmt = BigInt(postBalance.uiTokenAmount.amount);
        if (postAmt === preAmt) continue;
        const owner = postBalance.owner ?? preBalance.owner ?? "";
        if (postAmt > preAmt) {
          if (owner === walletStr) {
            config.onTransfer({
              signature: logs.signature,
              slot,
              mint: postBalance.mint,
              amount: (postAmt - preAmt).toString(),
              sender: preBalance.owner ?? "unknown",
              receiver: walletStr
            });
          }
        } else {
          if (owner === walletStr) {
            config.onTransfer({
              signature: logs.signature,
              slot,
              mint: preBalance.mint,
              amount: (preAmt - postAmt).toString(),
              sender: walletStr,
              receiver: postBalance.owner ?? "unknown"
            });
          }
        }
      }
    } catch (err) {
      config.onError(
        err instanceof Error ? err : new Error(String(err))
      );
    }
  }
  return {
    async start() {
      subId = await connection.onLogs(
        walletPk,
        (logs, context) => {
          handleLogs(logs, context.slot).catch(config.onError);
        },
        "confirmed"
      );
    },
    async stop() {
      if (subId !== null) {
        await connection.removeOnLogsListener(subId);
        subId = null;
      }
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createListener
});
//# sourceMappingURL=index.cjs.map