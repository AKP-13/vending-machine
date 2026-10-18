// All money is integer pence.

export const DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100, 200] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

export type ChangeSupply = Record<Denomination, number>;

export type MachineSnapshot = {
  changeSupply: ChangeSupply;
  changeSupplyTotal: number;
  cashBox: number;
};

export type PurchaseRequest = { customerId: string; price: number; amountPaid: number };

export type PurchaseResult =
  | { ok: true; change: Denomination[]; changeTotal: number }
  | { ok: false; code: "RATE_LIMITED"; retryAfterMs: number }
  | { ok: false; code: "INSUFFICIENT_PAYMENT"; shortfall: number }
  | { ok: false; code: "CANNOT_MAKE_CHANGE"; changeDue: number }
  | { ok: false; code: "INVALID_REQUEST"; message: string };

export type VendingMachine = {
  /** `now` is the time in ms. A refusal does not change the state. */
  purchase(request: PurchaseRequest, now: number): PurchaseResult;
  getSnapshot(): MachineSnapshot;
};

const FLOAT_PER_COIN = 10;

function startingFloat(): ChangeSupply {
  return Object.fromEntries(DENOMINATIONS.map((coin) => [coin, FLOAT_PER_COIN])) as ChangeSupply;
}

export function createVendingMachine(): VendingMachine {
  const changeSupply = startingFloat();
  let cashBox = 0;

  return {
    purchase({ price, amountPaid }) {
      if (amountPaid < price) return { ok: false, code: "INSUFFICIENT_PAYMENT", shortfall: price - amountPaid };

      const changeDue = amountPaid - price;
      // Ticket 02 adds the change maker. Until then, only exact money sells.
      if (changeDue > 0) return { ok: false, code: "CANNOT_MAKE_CHANGE", changeDue };

      cashBox += amountPaid;
      return { ok: true, change: [], changeTotal: 0 };
    },

    getSnapshot() {
      return {
        changeSupply: { ...changeSupply },
        changeSupplyTotal: DENOMINATIONS.reduce((total, coin) => total + coin * changeSupply[coin], 0),
        cashBox,
      };
    },
  };
}
