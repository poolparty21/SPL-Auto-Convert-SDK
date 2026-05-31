import { describe, it, expect } from 'vitest';
import { estimateValueInUsd } from '../jupiter';

describe('jupiter', () => {
  it('should export estimateValueInUsd', () => {
    expect(estimateValueInUsd).toBeDefined();
    expect(typeof estimateValueInUsd).toBe('function');
  });
});
