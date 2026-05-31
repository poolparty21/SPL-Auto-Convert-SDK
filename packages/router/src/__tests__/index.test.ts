import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getQuote,
  getSwapTransaction,
  executeSwap,
  getTokenPriceInUsd,
  estimateValueInUsd,
  type JupiterQuoteResponse,
  type JupiterSwapResponse,
} from "../index.js";

// ── Mock fetch ─────────────────────────────────────────────────────

const mockFetch = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", mockFetch);

// ── Mock @solana/web3.js ──────────────────────────────────────────

vi.mock("@solana/web3.js", () => {
  const mockTx = {
    sign: vi.fn(),
    serialize: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
  };

  class MockKeypair {
    publicKey = { toBase58: () => "Gj8gZvFh7Kz9Q2Mqz3x4R5t6Y7u8I9o0P1a2S3d4F5" };
    secretKey = new Uint8Array(64);
  }

  return {
    Connection: vi.fn().mockImplementation(() => ({
      sendRawTransaction: vi.fn<() => Promise<string>>(),
      confirmTransaction: vi.fn<() => Promise<{ value: { err: null } }>>(),
    })),
    Keypair: MockKeypair,
    VersionedTransaction: {
      deserialize: vi.fn().mockReturnValue(mockTx),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Sample responses ───────────────────────────────────────────────

const sampleQuote: JupiterQuoteResponse = {
  inputMint: "So11111111111111111111111111111111111111112",
  outputMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  inAmount: "1000000000",
  outAmount: "1420000",
  otherAmountThreshold: "1413000",
  priceImpactPct: "0.05",
  routePlan: [
    {
      swapInfo: {
        label: "Orca",
        inputMint: "So11111111111111111111111111111111111111112",
        outputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        inAmount: "1000000000",
        outAmount: "1420000",
        feeAmount: "1000",
        feeMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      },
    },
  ],
};

const sampleSwap: JupiterSwapResponse = {
  swapTransaction: "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  lastValidBlockHeight: 300123456,
  prioritizationFeeLamports: 1000,
  computeUnitLimit: 200000,
  prioritizationType: {
    computeBudget: {
      microLamports: 10000,
      estimatedMicroLamports: 12000,
    },
  },
  dynamicSlippageReport: {
    slippageBps: 50,
    otherAmount: 1410000,
    simulatedIncurredSlippageBps: 5,
  },
  simulationError: null,
};

// ── Helpers ────────────────────────────────────────────────────────

function okJson(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function notOk(text: string, status = 400): Response {
  return new Response(text, { status });
}

// ── getQuote ───────────────────────────────────────────────────────

describe("getQuote", () => {
  it("should call the Jupiter quote API with default params", async () => {
    mockFetch.mockResolvedValue(okJson(sampleQuote));

    const result = await getQuote(
      "So11111111111111111111111111111111111111112",
      "1000000000"
    );

    expect(result).toEqual(sampleQuote);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/quote");
    expect(url).toContain("inputMint=So11111111111111111111111111111111111111112");
    expect(url).toContain("amount=1000000000");
    expect(url).toContain("outputMint=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
    expect(url).toContain("slippageBps=50");
    expect(url).toContain("onlyDirectRoutes=false");
  });

  it("should accept custom options", async () => {
    mockFetch.mockResolvedValue(okJson(sampleQuote));

    await getQuote(
      "So11111111111111111111111111111111111111112",
      "500000000",
      { slippageBps: 100, onlyDirectRoutes: true }
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("slippageBps=100");
    expect(url).toContain("onlyDirectRoutes=true");
  });

  it("should throw on HTTP error", async () => {
    mockFetch.mockResolvedValue(notOk("Rate limited"));

    await expect(
      getQuote("So11111111111111111111111111111111111111112", "1000")
    ).rejects.toThrow(/Jupiter quote error/);
  });
});

// ── getSwapTransaction ─────────────────────────────────────────────

describe("getSwapTransaction", () => {
  it("should POST to the Jupiter swap API", async () => {
    mockFetch.mockResolvedValue(okJson(sampleSwap));

    const result = await getSwapTransaction(
      sampleQuote,
      "Gj8gZvFh7Kz9Q2Mqz3x4R5t6Y7u8I9o0P1a2S3d4F5"
    );

    expect(result).toEqual(sampleSwap);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain("/swap");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });

    const body = JSON.parse(init?.body as string);
    expect(body.quoteResponse).toEqual(sampleQuote);
    expect(body.userPublicKey).toBe("Gj8gZvFh7Kz9Q2Mqz3x4R5t6Y7u8I9o0P1a2S3d4F5");
    expect(body.wrapAndUnwrapSol).toBe(true);
    expect(body.prioritizationFeeLamports).toBe("auto");
  });

  it("should throw on HTTP error", async () => {
    mockFetch.mockResolvedValue(notOk("Bad request"));

    await expect(
      getSwapTransaction(sampleQuote, "Gj8gZvFh7Kz9Q2Mqz3x4R5t6Y7u8I9o0P1a2S3d4F5")
    ).rejects.toThrow(/Jupiter swap error/);
  });
});

// ── executeSwap ────────────────────────────────────────────────────

describe("executeSwap", () => {
  async function makeConnection() {
    const { Connection } = await import("@solana/web3.js");
    const conn = new (Connection as any)();
    return conn;
  }

  async function makeKeypair() {
    const { Keypair } = await import("@solana/web3.js");
    return new (Keypair as any)();
  }

  it("should sign, send, and confirm a swap transaction", async () => {
    const conn = await makeConnection();
    conn.sendRawTransaction.mockResolvedValue("txHash123");
    conn.confirmTransaction.mockResolvedValue({ value: { err: null } });

    const kp = await makeKeypair();

    const result = await executeSwap(sampleSwap, kp, conn);

    expect(result).toBe("txHash123");
    expect(conn.sendRawTransaction).toHaveBeenCalledTimes(1);
    expect(conn.confirmTransaction).toHaveBeenCalledTimes(1);
  });

  it("should throw if the transaction fails on-chain", async () => {
    const conn = await makeConnection();
    conn.sendRawTransaction.mockResolvedValue("txHash123");
    conn.confirmTransaction.mockResolvedValue({
      value: { err: "Instruction error" },
    });

    const kp = await makeKeypair();

    await expect(
      executeSwap(sampleSwap, kp, conn)
    ).rejects.toThrow(/Swap transaction failed/);
  });
});

// ── getTokenPriceInUsd ─────────────────────────────────────────────

describe("getTokenPriceInUsd", () => {
  it("should return a price from Jupiter", async () => {
    mockFetch.mockResolvedValue(okJson(sampleQuote));

    const price = await getTokenPriceInUsd(
      "So11111111111111111111111111111111111111112"
    );

    expect(price).toBeCloseTo(1.42, 2); // 1420000 / 1_000_000
  });

  it("should return null on HTTP error", async () => {
    mockFetch.mockResolvedValue(notOk("Not found"));

    const price = await getTokenPriceInUsd(
      "So11111111111111111111111111111111111111112"
    );
    expect(price).toBeNull();
  });

  it("should return null on fetch exception", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const price = await getTokenPriceInUsd(
      "So11111111111111111111111111111111111111112"
    );
    expect(price).toBeNull();
  });
});

// ── estimateValueInUsd ─────────────────────────────────────────────

describe("estimateValueInUsd", () => {
  it("should compute the USD value", async () => {
    mockFetch.mockResolvedValue(okJson(sampleQuote));

    const value = await estimateValueInUsd(
      "So11111111111111111111111111111111111111112",
      "1000000000",
      9
    );

    // 1 SOL * price=1.42 = ~1.42
    expect(value).toBeCloseTo(1.42, 2);
  });

  it("should return null when price is unavailable", async () => {
    mockFetch.mockResolvedValue(notOk("Not found"));

    const value = await estimateValueInUsd(
      "So11111111111111111111111111111111111111112",
      "1000000000",
      9
    );
    expect(value).toBeNull();
  });
});
