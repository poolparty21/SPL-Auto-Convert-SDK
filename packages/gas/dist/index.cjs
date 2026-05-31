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
  createGasManager: () => createGasManager
});
module.exports = __toCommonJS(index_exports);
var import_web3 = require("@solana/web3.js");
function createGasManager(config) {
  const connection = new import_web3.Connection(config.rpcUrl);
  const publicKey = new import_web3.PublicKey(config.walletAddress);
  const minimumBalance = config.minimumBalanceSol;
  const targetBalance = config.targetBalanceSol ?? minimumBalance * 2;
  return {
    async checkBalance() {
      const lamports = await connection.getBalance(publicKey);
      const currentBalance = lamports / import_web3.LAMPORTS_PER_SOL;
      return {
        currentBalance,
        minimumBalance,
        hasEnoughGas: currentBalance >= minimumBalance,
        deficit: Math.max(0, minimumBalance - currentBalance)
      };
    },
    async needsTopUp() {
      const status = await this.checkBalance();
      return !status.hasEnoughGas || status.currentBalance < targetBalance;
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createGasManager
});
//# sourceMappingURL=index.cjs.map