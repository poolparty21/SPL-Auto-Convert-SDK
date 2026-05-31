// src/index.ts
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { createListener } from "@kololabs/listener";
import { getQuote, getSwapTransaction } from "@kololabs/router";
import { createGasManager } from "@kololabs/gas";
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
  const connection = new Connection(rpcUrl);
  const gasManager = createGasManager({
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
    const quote = await getQuote(transfer.mint, transfer.amount, jupOptions);
    const swapData = await getSwapTransaction(quote, walletAddress, jupOptions);
    const txBuffer = Buffer.from(swapData.swapTransaction, "base64");
    const transaction = VersionedTransaction.deserialize(txBuffer);
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
  const listener = createListener({
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
export {
  createEngine
};
//# sourceMappingURL=index.js.map