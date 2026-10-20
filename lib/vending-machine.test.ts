import { describe, expect, it } from "vitest";
import { createVendingMachine, type PurchaseRequest } from "./vending-machine";

const NOW = 1_000_000;

// The API passes any JSON body to purchase().
const raw = (body: unknown) => body as PurchaseRequest;

const BAD_CUSTOMER = "customerId must be a non-empty string.";
const BAD_PRICE = "price must be a positive whole number of pence.";
const BAD_AMOUNT = "amountPaid must be a whole number of pence, 0 or more.";

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

  it("gives the fewest coins as change, takes them from the change supply and keeps the payment", () => {
    const machine = createVendingMachine();

    const result = machine.purchase({ customerId: "ada", price: 135, amountPaid: 200 }, NOW);

    expect(result).toEqual({ ok: true, change: [50, 10, 5], changeTotal: 65 });
    expect(machine.getSnapshot()).toEqual({
      changeSupply: { 1: 10, 2: 10, 5: 9, 10: 9, 20: 10, 50: 9, 100: 10, 200: 10 },
      changeSupplyTotal: 3815,
      cashBox: 200,
    });
  });

  it("refuses change that needs a coin that ran out, keeps its state, and still sells with other coins", () => {
    const machine = createVendingMachine();
    for (let sale = 0; sale < 10; sale++) machine.purchase({ customerId: "ada", price: 99, amountPaid: 100 }, NOW);
    const before = machine.getSnapshot();
    expect(before.changeSupply[1]).toBe(0);

    const refused = machine.purchase({ customerId: "ada", price: 99, amountPaid: 100 }, NOW);

    expect(refused).toEqual({ ok: false, code: "CANNOT_MAKE_CHANGE", changeDue: 1 });
    expect(machine.getSnapshot()).toEqual(before);

    const sold = machine.purchase({ customerId: "ada", price: 98, amountPaid: 100 }, NOW);

    expect(sold).toEqual({ ok: true, change: [2], changeTotal: 2 });
    expect(machine.getSnapshot().changeSupply[1]).toBe(0);
  });

  it("refuses a change due that is more than the whole change supply, and keeps its state", () => {
    const machine = createVendingMachine();
    const before = machine.getSnapshot();

    const result = machine.purchase({ customerId: "ada", price: 100, amountPaid: 10_000_000_100 }, NOW);

    expect(result).toEqual({ ok: false, code: "CANNOT_MAKE_CHANGE", changeDue: 10_000_000_000 });
    expect(machine.getSnapshot()).toEqual(before);
  });

  it("refuses an underpayment with the shortfall, and keeps its state", () => {
    const machine = createVendingMachine();
    const before = machine.getSnapshot();

    const result = machine.purchase({ customerId: "ada", price: 135, amountPaid: 100 }, NOW);

    expect(result).toEqual({ ok: false, code: "INSUFFICIENT_PAYMENT", shortfall: 35 });
    expect(machine.getSnapshot()).toEqual(before);
  });

  it.each([
    ["no body", null, BAD_CUSTOMER],
    ["no customer ID", { price: 135, amountPaid: 135 }, BAD_CUSTOMER],
    ["a blank customer ID", { customerId: "  ", price: 135, amountPaid: 135 }, BAD_CUSTOMER],
    ["a bad customer ID before a bad price", { customerId: "", price: -1, amountPaid: 135 }, BAD_CUSTOMER],
    ["a zero price", { customerId: "ada", price: 0, amountPaid: 135 }, BAD_PRICE],
    ["a fractional price", { customerId: "ada", price: 1.5, amountPaid: 135 }, BAD_PRICE],
    ["a price as a string", { customerId: "ada", price: "135", amountPaid: 135 }, BAD_PRICE],
    ["a bad price before an underpayment", { customerId: "ada", price: 1.5, amountPaid: 0 }, BAD_PRICE],
    ["a negative amount paid", { customerId: "ada", price: 135, amountPaid: -1 }, BAD_AMOUNT],
    ["a fractional amount paid", { customerId: "ada", price: 135, amountPaid: 135.5 }, BAD_AMOUNT],
  ])("refuses %s as an invalid request, and keeps its state", (_, body, message) => {
    const machine = createVendingMachine();
    const before = machine.getSnapshot();

    const result = machine.purchase(raw(body), NOW);

    expect(result).toEqual({ ok: false, code: "INVALID_REQUEST", message });
    expect(machine.getSnapshot()).toEqual(before);
  });
});
