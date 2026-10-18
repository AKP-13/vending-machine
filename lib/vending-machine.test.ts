import { describe, expect, it } from "vitest";
import { createVendingMachine } from "./vending-machine";

const NOW = 1_000_000;

describe("vending machine", () => {
  it("starts with ten of each coin (£38.80) and an empty cash box", () => {
    const machine = createVendingMachine();

    expect(machine.getSnapshot()).toEqual({
      changeSupply: { 1: 10, 2: 10, 5: 10, 10: 10, 20: 10, 50: 10, 100: 10, 200: 10 },
      changeSupplyTotal: 3880,
      cashBox: 0,
    });
  });

  it("sells for exact money with no change and puts the money in the cash box", () => {
    const machine = createVendingMachine();

    const result = machine.purchase({ customerId: "ada", price: 135, amountPaid: 135 }, NOW);

    expect(result).toEqual({ ok: true, change: [], changeTotal: 0 });
    expect(machine.getSnapshot()).toMatchObject({ changeSupplyTotal: 3880, cashBox: 135 });
  });

  it("refuses an overpayment until it can make change, and keeps its state", () => {
    const machine = createVendingMachine();
    const before = machine.getSnapshot();

    const result = machine.purchase({ customerId: "ada", price: 135, amountPaid: 200 }, NOW);

    expect(result).toEqual({ ok: false, code: "CANNOT_MAKE_CHANGE", changeDue: 65 });
    expect(machine.getSnapshot()).toEqual(before);
  });

  it("refuses an underpayment with the shortfall, and keeps its state", () => {
    const machine = createVendingMachine();
    const before = machine.getSnapshot();

    const result = machine.purchase({ customerId: "ada", price: 135, amountPaid: 100 }, NOW);

    expect(result).toEqual({ ok: false, code: "INSUFFICIENT_PAYMENT", shortfall: 35 });
    expect(machine.getSnapshot()).toEqual(before);
  });
});
