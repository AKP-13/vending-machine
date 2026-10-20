import { describe, expect, it } from "vitest";
import { makeChange } from "./change-maker";
import type { ChangeSupply } from "./vending-machine";

const EMPTY: ChangeSupply = { 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 50: 0, 100: 0, 200: 0 };
const supplyOf = (coins: Partial<ChangeSupply>): ChangeSupply => ({ ...EMPTY, ...coins });

describe("change maker", () => {
  it("gives three 20p for 60p when greedy would give 50p and five 2p", () => {
    expect(makeChange(60, supplyOf({ 50: 1, 20: 3, 2: 5 }))).toEqual([20, 20, 20]);
  });

  it("gives three 20p for 60p when greedy would refuse", () => {
    expect(makeChange(60, supplyOf({ 50: 1, 20: 3 }))).toEqual([20, 20, 20]);
  });

  it("uses the larger coins when two answers have the same number of coins", () => {
    // 50p + 5p + 5p and 20p + 20p + 20p are both three coins.
    expect(makeChange(60, supplyOf({ 50: 1, 20: 3, 5: 2 }))).toEqual([50, 5, 5]);
  });

  it("returns null when the coins cannot make the amount", () => {
    expect(makeChange(3, supplyOf({ 2: 5 }))).toBeNull();
  });
});
