// src/index.ts
import { Connection, PublicKey } from "@solana/web3.js";
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
  const connection = new Connection(config.rpcUrl);
  const walletPk = new PublicKey(config.walletAddress);
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
export {
  createListener
};
//# sourceMappingURL=index.js.map