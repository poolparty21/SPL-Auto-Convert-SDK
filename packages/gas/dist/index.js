// src/index.ts
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
function createGasManager(config) {
  const connection = new Connection(config.rpcUrl);
  const publicKey = new PublicKey(config.walletAddress);
  const minimumBalance = config.minimumBalanceSol;
  const targetBalance = config.targetBalanceSol ?? minimumBalance * 2;
  return {
    async checkBalance() {
      const lamports = await connection.getBalance(publicKey);
      const currentBalance = lamports / LAMPORTS_PER_SOL;
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
export {
  createGasManager
};
//# sourceMappingURL=index.js.map