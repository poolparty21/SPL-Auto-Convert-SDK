'use strict';

var core = require('@kololabs/core');

// src/index.ts
var MIN_GAS_SOL = core.CHAINS.solana.gasConstants.minNative;
var TARGET_GAS_SOL = core.CHAINS.solana.gasConstants.targetNative;
async function checkGasForSwap(publicKey) {
  const balance = await core.getSolBalance(publicKey);
  return {
    sufficient: balance >= MIN_GAS_SOL,
    balance,
    minRequired: MIN_GAS_SOL,
    target: TARGET_GAS_SOL
  };
}
async function shouldKeepSolForGas(publicKey) {
  const balance = await core.getSolBalance(publicKey);
  return {
    keep: balance < TARGET_GAS_SOL,
    balance,
    target: TARGET_GAS_SOL
  };
}
async function gasDeficit(publicKey) {
  const balance = await core.getSolBalance(publicKey);
  return {
    deficit: Math.max(0, TARGET_GAS_SOL - balance),
    balance,
    target: TARGET_GAS_SOL
  };
}

exports.MIN_GAS_SOL = MIN_GAS_SOL;
exports.TARGET_GAS_SOL = TARGET_GAS_SOL;
exports.checkGasForSwap = checkGasForSwap;
exports.gasDeficit = gasDeficit;
exports.shouldKeepSolForGas = shouldKeepSolForGas;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map