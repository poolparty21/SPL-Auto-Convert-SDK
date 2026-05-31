import { CHAINS, getSolBalance } from '@kololabs/core';

// src/index.ts
var MIN_GAS_SOL = CHAINS.solana.gasConstants.minNative;
var TARGET_GAS_SOL = CHAINS.solana.gasConstants.targetNative;
async function checkGasForSwap(publicKey) {
  const balance = await getSolBalance(publicKey);
  return {
    sufficient: balance >= MIN_GAS_SOL,
    balance,
    minRequired: MIN_GAS_SOL,
    target: TARGET_GAS_SOL
  };
}
async function shouldKeepSolForGas(publicKey) {
  const balance = await getSolBalance(publicKey);
  return {
    keep: balance < TARGET_GAS_SOL,
    balance,
    target: TARGET_GAS_SOL
  };
}
async function gasDeficit(publicKey) {
  const balance = await getSolBalance(publicKey);
  return {
    deficit: Math.max(0, TARGET_GAS_SOL - balance),
    balance,
    target: TARGET_GAS_SOL
  };
}

export { MIN_GAS_SOL, TARGET_GAS_SOL, checkGasForSwap, gasDeficit, shouldKeepSolForGas };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map