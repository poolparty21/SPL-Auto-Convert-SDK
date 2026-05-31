import { describe, it, expect } from 'vitest';
import { MIN_GAS_SOL, TARGET_GAS_SOL } from '../index';

describe('gas', () => {
  it('should export min and target gas constants', () => {
    expect(MIN_GAS_SOL).toBeGreaterThan(0);
    expect(TARGET_GAS_SOL).toBeGreaterThan(MIN_GAS_SOL);
  });

  it('should have reasonable SOL values', () => {
    expect(MIN_GAS_SOL).toBe(0.1);
    expect(TARGET_GAS_SOL).toBe(0.2);
  });
});
