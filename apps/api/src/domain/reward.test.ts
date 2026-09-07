import { describe, expect, it } from 'vitest';
import { estimateReward } from './reward.js';

describe('estimateReward', () => {
  it.each([
    [{ areaCode: 1, isDecliningArea: false, quietWeight: 1 }, 100, 1],
    [{ areaCode: 32, isDecliningArea: false, quietWeight: 1 }, 150, 1.5],
    [{ areaCode: 32, isDecliningArea: true, quietWeight: 1 }, 250, 2.5],
    [{ areaCode: 32, isDecliningArea: true, quietWeight: 2 }, 500, 2.5],
    [{ areaCode: 1, isDecliningArea: false, quietWeight: 0.01 }, 10, 1],
  ] as const)('calculates the approved estimate', (input, points, areaWeight) => {
    expect(estimateReward(input)).toMatchObject({ points, factors: { areaWeight }, policyVersion: 'reward-v1' });
  });
});
