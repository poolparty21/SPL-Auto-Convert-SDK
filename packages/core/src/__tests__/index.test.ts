import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEngine } from "../index.js";
import type { KoloEngineConfig } from "../index.js";

// ── Mock @kolo/listener ───────────────────────────────────────────
// Mock functions are module-scoped so they persist across clears
const mockListenerStart = vi.fn<() => Promise<void>>();
const mockListenerStop = vi.fn<() => Promise<void>>();

vi.mock("@kolo/listener", () => ({
  createListener: vi.fn(() => ({
    start: mockListenerStart,
    stop: mockListenerStop,
  })),
}));

// ── Mock @kolo/router ────────────────────────────────────────────

vi.mock("@kolo/router", () => ({
  getQuote: vi.fn(),
  getSwapTransaction: vi.fn(),
}));

// ── Mock @kolo/gas ────────────────────────────────────────────────

const mockCheckBalance = vi.fn();
const mockNeedsTopUp = vi.fn();

vi.mock("@kolo/gas", () => ({
  createGasManager: vi.fn(() => ({
    checkBalance: mockCheckBalance,
    needsTopUp: mockNeedsTopUp,
  })),
}));

// ── Mock @solana/web3.js ──────────────────────────────────────────

vi.mock("@solana/web3.js", () => {
  return {
    Connection: vi.fn().mockImplementation(() => ({
      sendRawTransaction: vi.fn().mockResolvedValue("mockTxSig"),
      confirmTransaction: vi
        .fn()
        .mockResolvedValue({ value: { err: null } }),
    })),
    VersionedTransaction: {
      deserialize: vi.fn().mockReturnValue({
        serialize: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
      }),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Base config ───────────────────────────────────────────────────

const baseConfig: KoloEngineConfig = {
  rpcUrl: "https://api.mainnet-beta.solana.com",
  walletAddress: "Gj8gZvFh7Kz9Q2Mqz3x4R5t6Y7u8I9o0P1a2S3d4F5",
  targetMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  minimumBalanceSol: 0.1,
  slippageBps: 50,
  signer: vi.fn<() => Promise<string>>().mockResolvedValue("mockSig"),
  onSwapComplete: vi.fn(),
  onError: vi.fn(),
};

// ── Tests ──────────────────────────────────────────────────────────

describe("createEngine", () => {
  it("should return an object with start and stop methods", () => {
    const engine = createEngine(baseConfig);
    expect(engine).toHaveProperty("start");
    expect(engine).toHaveProperty("stop");
    expect(typeof engine.start).toBe("function");
    expect(typeof engine.stop).toBe("function");
  });

  it("start() should call listener.start()", async () => {
    const engine = createEngine(baseConfig);
    await engine.start();
    expect(mockListenerStart).toHaveBeenCalledTimes(1);
  });

  it("stop() should call listener.stop()", async () => {
    const engine = createEngine(baseConfig);
    await engine.stop();
    expect(mockListenerStop).toHaveBeenCalledTimes(1);
  });

  it("should create listener, gas manager, and connection on construction", async () => {
    createEngine(baseConfig);

    const { createListener: mockCL } = await import("@kolo/listener");
    const { createGasManager: mockCGM } = await import("@kolo/gas");
    const { Connection: MockConn } = await import("@solana/web3.js");

    expect(mockCL).toHaveBeenCalledTimes(1);
    expect(mockCL).toHaveBeenCalledWith(
      expect.objectContaining({
        rpcUrl: baseConfig.rpcUrl,
        walletAddress: baseConfig.walletAddress,
      })
    );

    expect(mockCGM).toHaveBeenCalledTimes(1);
    expect(MockConn).toHaveBeenCalledTimes(1);
    expect(MockConn).toHaveBeenCalledWith(baseConfig.rpcUrl);
  });

  it("should forward onError when listener reports an error", async () => {
    createEngine(baseConfig);

    const { createListener: mockCL } = await import("@kolo/listener");
    const listenerCfg = (mockCL as any).mock.calls[0][0];

    const testError = new Error("Listener connection error");
    listenerCfg.onError(testError);

    expect(baseConfig.onError).toHaveBeenCalledWith(testError);
  });

  describe("transfer handling", () => {
    async function getOnTransfer(): Promise<(event: any) => Promise<void>> {
      const { createListener: mockCL } = await import("@kolo/listener");
      return (mockCL as any).mock.calls[0][0].onTransfer;
    }

    it("should skip swap when incoming SOL and needsTopUp is true", async () => {
      mockCheckBalance.mockResolvedValue({
        currentBalance: 0.05,
        minimumBalance: 0.1,
        hasEnoughGas: false,
        deficit: 0.05,
      });
      mockNeedsTopUp.mockResolvedValue(true);

      createEngine(baseConfig);
      const onTransfer = await getOnTransfer();

      await onTransfer({
        signature: "tx1",
        slot: 100,
        mint: "So11111111111111111111111111111111111111112", // SOL
        amount: "1000000000",
        sender: "sender1",
        receiver: baseConfig.walletAddress,
      });

      const { getQuote } = await import("@kolo/router");
      expect(getQuote).not.toHaveBeenCalled();
      expect(baseConfig.onError).not.toHaveBeenCalled();
      expect(baseConfig.onSwapComplete).not.toHaveBeenCalled();
    });

    it("should call onError when non-SOL incoming and hasEnoughGas is false", async () => {
      mockCheckBalance.mockResolvedValue({
        currentBalance: 0.03,
        minimumBalance: 0.1,
        hasEnoughGas: false,
        deficit: 0.07,
      });
      mockNeedsTopUp.mockResolvedValue(true);

      createEngine(baseConfig);
      const onTransfer = await getOnTransfer();

      await onTransfer({
        signature: "tx2",
        slot: 101,
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        amount: "1000000",
        sender: "sender1",
        receiver: baseConfig.walletAddress,
      });

      const { getQuote } = await import("@kolo/router");
      expect(getQuote).not.toHaveBeenCalled();
      expect(baseConfig.onError).toHaveBeenCalledTimes(1);
      expect(baseConfig.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Insufficient gas"),
        })
      );
    });

    it("should perform full swap flow when gas is sufficient", async () => {
      mockCheckBalance.mockResolvedValue({
        currentBalance: 0.5,
        minimumBalance: 0.1,
        hasEnoughGas: true,
        deficit: 0,
      });
      mockNeedsTopUp.mockResolvedValue(false);

      const { getQuote, getSwapTransaction } = await import("@kolo/router");
      (getQuote as any).mockResolvedValue({
        inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        outputMint: baseConfig.targetMint,
        inAmount: "1000000",
        outAmount: "999000",
        otherAmountThreshold: "994000",
        priceImpactPct: "0.01",
        routePlan: [],
      });

      (getSwapTransaction as any).mockResolvedValue({
        swapTransaction:
          "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        lastValidBlockHeight: 300123456,
        prioritizationFeeLamports: 1000,
        computeUnitLimit: 200000,
        prioritizationType: {
          computeBudget: { microLamports: 10000, estimatedMicroLamports: 12000 },
        },
        dynamicSlippageReport: {
          slippageBps: 50,
          otherAmount: 1410000,
          simulatedIncurredSlippageBps: 5,
        },
        simulationError: null,
      });

      createEngine(baseConfig);
      const onTransfer = await getOnTransfer();

      await onTransfer({
        signature: "tx3",
        slot: 102,
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: "1000000",
        sender: "sender1",
        receiver: baseConfig.walletAddress,
      });

      expect(getQuote).toHaveBeenCalledTimes(1);
      expect(getSwapTransaction).toHaveBeenCalledTimes(1);

      expect(baseConfig.signer).toHaveBeenCalledTimes(1);

      const { Connection: MockConn } = await import("@solana/web3.js");
      const conn = (MockConn as any).mock.results[0].value;
      expect(conn.sendRawTransaction).toHaveBeenCalledTimes(1);
      expect(conn.confirmTransaction).toHaveBeenCalledTimes(1);

      expect(baseConfig.onSwapComplete).toHaveBeenCalledTimes(1);
    });

    it("should retry once with +100 bps slippage on failure", async () => {
      mockCheckBalance.mockResolvedValue({
        currentBalance: 0.5,
        minimumBalance: 0.1,
        hasEnoughGas: true,
        deficit: 0,
      });
      mockNeedsTopUp.mockResolvedValue(false);

      const { getQuote, getSwapTransaction } = await import("@kolo/router");
      (getQuote as any)
        .mockRejectedValueOnce(new Error("Jupiter error"))
        .mockResolvedValueOnce({
          inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          outputMint: baseConfig.targetMint,
          inAmount: "1000000",
          outAmount: "999000",
          otherAmountThreshold: "994000",
          priceImpactPct: "0.01",
          routePlan: [],
        });

      (getSwapTransaction as any).mockResolvedValue({
        swapTransaction:
          "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        lastValidBlockHeight: 300123456,
        prioritizationFeeLamports: 1000,
        computeUnitLimit: 200000,
        prioritizationType: {
          computeBudget: { microLamports: 10000, estimatedMicroLamports: 12000 },
        },
        dynamicSlippageReport: {
          slippageBps: 50,
          otherAmount: 1410000,
          simulatedIncurredSlippageBps: 5,
        },
        simulationError: null,
      });

      createEngine(baseConfig);
      const onTransfer = await getOnTransfer();

      await onTransfer({
        signature: "tx4",
        slot: 103,
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: "1000000",
        sender: "sender1",
        receiver: baseConfig.walletAddress,
      });

      expect(getQuote).toHaveBeenCalledTimes(2);

      expect(getQuote).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ slippageBps: 50 })
      );

      expect(getQuote).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ slippageBps: 150 })
      );

      expect(baseConfig.onSwapComplete).toHaveBeenCalledTimes(1);
      expect(baseConfig.onError).not.toHaveBeenCalled();
    });

    it("should call onError when retry also fails", async () => {
      mockCheckBalance.mockResolvedValue({
        currentBalance: 0.5,
        minimumBalance: 0.1,
        hasEnoughGas: true,
        deficit: 0,
      });
      mockNeedsTopUp.mockResolvedValue(false);

      const { getQuote } = await import("@kolo/router");
      (getQuote as any)
        .mockRejectedValueOnce(new Error("First attempt failed"))
        .mockRejectedValueOnce(new Error("Retry also failed"));

      createEngine(baseConfig);
      const onTransfer = await getOnTransfer();

      await onTransfer({
        signature: "tx5",
        slot: 104,
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        amount: "1000000",
        sender: "sender1",
        receiver: baseConfig.walletAddress,
      });

      expect(getQuote).toHaveBeenCalledTimes(2);
      expect(baseConfig.onError).toHaveBeenCalledTimes(1);
      expect(baseConfig.onSwapComplete).not.toHaveBeenCalled();
    });
  });
});
