import { describe, it, expect, vi, beforeEach } from "vitest";
import { createListener } from "../index.js";
import type { TransferEvent } from "../index.js";

// ── Shared mocks ───────────────────────────────────────────────────

const mockOnLogs = vi.fn();
const mockRemoveOnLogsListener = vi.fn<() => Promise<boolean>>();
const mockGetParsedTransaction = vi.fn();

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
      onLogs: mockOnLogs,
      removeOnLogsListener: mockRemoveOnLogsListener,
      getParsedTransaction: mockGetParsedTransaction,
    })),
    PublicKey: MockPublicKey,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ── createListener / start / stop ───────────────────────────────────

describe("createListener", () => {
  it("should return an object with start() and stop()", () => {
    const listener = createListener({
      rpcUrl: "https://api.devnet.solana.com",
      walletAddress: "11111111111111111111111111111111",
      onTransfer: vi.fn(),
      onError: vi.fn(),
    });

    expect(listener).toHaveProperty("start");
    expect(listener).toHaveProperty("stop");
    expect(typeof listener.start).toBe("function");
    expect(typeof listener.stop).toBe("function");
  });

  it("should throw on missing rpcUrl", () => {
    expect(() =>
      createListener({
        rpcUrl: "",
        walletAddress: "11111111111111111111111111111111",
        onTransfer: vi.fn(),
        onError: vi.fn(),
      })
    ).toThrow("rpcUrl is required");
  });

  it("should throw on missing walletAddress", () => {
    expect(() =>
      createListener({
        rpcUrl: "https://api.devnet.solana.com",
        walletAddress: "",
        onTransfer: vi.fn(),
        onError: vi.fn(),
      })
    ).toThrow("walletAddress is required");
  });

  it("should throw on missing onTransfer", () => {
    expect(() =>
      createListener({
        rpcUrl: "https://api.devnet.solana.com",
        walletAddress: "11111111111111111111111111111111",
        onTransfer: undefined as unknown as (e: TransferEvent) => void,
        onError: vi.fn(),
      })
    ).toThrow("onTransfer callback is required");
  });
});

describe("start()", () => {
  it("should call Connection.onLogs with config values", async () => {
    mockOnLogs.mockResolvedValue(42);

    const listener = createListener({
      rpcUrl: "https://api.devnet.solana.com",
      walletAddress: "11111111111111111111111111111111",
      onTransfer: vi.fn(),
      onError: vi.fn(),
    });

    await listener.start();

    expect(mockOnLogs).toHaveBeenCalledTimes(1);
    const [filter, , commitment] = mockOnLogs.mock.calls[0];
    expect(filter.toBase58()).toBe("11111111111111111111111111111111");
    expect(commitment).toBe("confirmed");
  });
});

describe("stop()", () => {
  it("should call removeOnLogsListener with the subscription ID", async () => {
    mockOnLogs.mockResolvedValue(42);
    mockRemoveOnLogsListener.mockResolvedValue(true);

    const listener = createListener({
      rpcUrl: "https://api.devnet.solana.com",
      walletAddress: "11111111111111111111111111111111",
      onTransfer: vi.fn(),
      onError: vi.fn(),
    });

    await listener.start();
    await listener.stop();

    expect(mockRemoveOnLogsListener).toHaveBeenCalledWith(42);
  });
});

describe("onError", () => {
  it("should call onError when getParsedTransaction throws", async () => {
    const onTransfer = vi.fn();
    const onError = vi.fn();

    // Make getParsedTransaction reject
    mockGetParsedTransaction.mockRejectedValue(new Error("RPC error"));

    // Capture the onLogs callback so we can invoke it manually
    let capturedCallback: ((logs: any, context: any) => void) | null = null;
    mockOnLogs.mockImplementation(
      async (_filter: unknown, cb: (logs: any, context: any) => void) => {
        capturedCallback = cb;
        return 99;
      }
    );

    const listener = createListener({
      rpcUrl: "https://api.devnet.solana.com",
      walletAddress: "11111111111111111111111111111111",
      onTransfer,
      onError,
    });

    await listener.start();

    expect(capturedCallback).not.toBeNull();

    // Manually invoke the callback with logs that include both the
    // token program ID and "Transfer" across multiple lines.
    capturedCallback!(
      {
        signature: "sig1",
        err: null,
        logs: [
          "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
          "Program log: Instruction: Transfer",
          "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA consumed 50000 of 200000 compute units",
          "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
        ],
      },
      { slot: 100 }
    );

    // Yield to the microtask queue so handleLogs can process the rejection
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "RPC error" })
    );
  });
});
