import { describe, it, expect, vi, beforeEach } from "vitest";
import { createGasManager } from "../index.js";
import type { GasConfig } from "../index.js";

// ── Shared mock state ─────────────────────────────────────────────
// This variable controls what getBalance() returns for ALL Connection instances
let mockBalanceLamports = 0;

vi.mock("@solana/web3.js", () => {
  class MockPublicKey {
    #value: string;
    constructor(value: string) {
      this.#value = value;
    }
    toBase58() {
      return this.#value;
    }
  }

  return {
    Connection: vi.fn().mockImplementation(() => ({
      getBalance: vi.fn().mockImplementation(() =>
        Promise.resolve(mockBalanceLamports)
      ),
    })),
    PublicKey: MockPublicKey,
    LAMPORTS_PER_SOL: 1_000_000_000,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mockBalanceLamports = 0;
});

// ── Tests ──────────────────────────────────────────────────────────

describe("createGasManager", () => {
  const baseConfig: GasConfig = {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    walletAddress: "Gj8gZvFh7Kz9Q2Mqz3x4R5t6Y7u8I9o0P1a2S3d4F5",
    minimumBalanceSol: 0.1,
  };

  it("should return an object with checkBalance and needsTopUp", () => {
    const mgr = createGasManager(baseConfig);
    expect(mgr).toHaveProperty("checkBalance");
    expect(mgr).toHaveProperty("needsTopUp");
    expect(typeof mgr.checkBalance).toBe("function");
    expect(typeof mgr.needsTopUp).toBe("function");
  });

  it("checkBalance should return GasStatus with hasEnoughGas=true when balance >= minimum", async () => {
    mockBalanceLamports = 500_000_000; // 0.5 SOL

    const mgr = createGasManager(baseConfig);
    const status = await mgr.checkBalance();

    expect(status).toMatchObject({
      currentBalance: 0.5,
      minimumBalance: 0.1,
      hasEnoughGas: true,
      deficit: 0,
    });
  });

  it("checkBalance should return hasEnoughGas=false when balance below minimum", async () => {
    mockBalanceLamports = 50_000_000; // 0.05 SOL

    const mgr = createGasManager(baseConfig);
    const status = await mgr.checkBalance();

    expect(status).toMatchObject({
      currentBalance: 0.05,
      minimumBalance: 0.1,
      hasEnoughGas: false,
    });
    expect(status.deficit).toBeCloseTo(0.05, 4);
  });

  it("checkBalance should report deficit = minimum - current when below minimum", async () => {
    mockBalanceLamports = 10_000_000; // 0.01 SOL

    const mgr = createGasManager(baseConfig);
    const status = await mgr.checkBalance();

    expect(status.deficit).toBeCloseTo(0.09, 4);
  });

  it("checkBalance should report deficit = 0 when at minimum exactly", async () => {
    mockBalanceLamports = 100_000_000; // 0.1 SOL

    const mgr = createGasManager(baseConfig);
    const status = await mgr.checkBalance();

    expect(status.hasEnoughGas).toBe(true);
    expect(status.deficit).toBe(0);
  });

  it("needsTopUp should return true when balance below minimum", async () => {
    mockBalanceLamports = 30_000_000; // 0.03 SOL

    const mgr = createGasManager(baseConfig);
    const needs = await mgr.needsTopUp();
    expect(needs).toBe(true);
  });

  it("needsTopUp should return true when balance above minimum but below target", async () => {
    mockBalanceLamports = 150_000_000; // 0.15 SOL (above 0.1 min, below 0.2 default target)

    const mgr = createGasManager(baseConfig);
    const needs = await mgr.needsTopUp();
    expect(needs).toBe(true);
  });

  it("needsTopUp should return false when balance meets or exceeds target", async () => {
    mockBalanceLamports = 300_000_000; // 0.3 SOL (above 0.2 default target)

    const mgr = createGasManager(baseConfig);
    const needs = await mgr.needsTopUp();
    expect(needs).toBe(false);
  });

  it("should accept a custom targetBalanceSol", async () => {
    mockBalanceLamports = 50_000_000; // 0.05 SOL

    const mgr = createGasManager({
      ...baseConfig,
      targetBalanceSol: 0.5,
    });

    const status = await mgr.checkBalance();
    expect(status.hasEnoughGas).toBe(false);
    expect(status.minimumBalance).toBe(0.1);

    const needs = await mgr.needsTopUp();
    expect(needs).toBe(true);
  });

  it("should use default target = minimumBalance * 2", async () => {
    mockBalanceLamports = 150_000_000; // 0.15 SOL

    const mgr = createGasManager({
      rpcUrl: "https://api.mainnet-beta.solana.com",
      walletAddress: "Gj8gZvFh7Kz9Q2Mqz3x4R5t6Y7u8I9o0P1a2S3d4F5",
      minimumBalanceSol: 0.1,
    });

    const status = await mgr.checkBalance();
    expect(status.hasEnoughGas).toBe(true);

    const needs = await mgr.needsTopUp();
    expect(needs).toBe(true); // 0.15 < 0.2 (default target = 0.1 * 2)
  });
});
