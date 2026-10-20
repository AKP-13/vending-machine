// All money is integer pence.

import { makeChange } from "./change-maker";

export const DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100, 200] as const;
export type Denomination = (typeof DENOMINATIONS)[number];

export type ChangeSupply = Record<Denomination, number>;

export type PurchaseRequest = { customerId: string; price: number; amountPaid: number };

export type PurchaseResult =
  | { ok: true; change: Denomination[]; changeTotal: number }
  | { ok: false; code: "RATE_LIMITED"; retryAfterMs: number }
  | { ok: false; code: "INSUFFICIENT_PAYMENT"; shortfall: number }
  | { ok: false; code: "CANNOT_MAKE_CHANGE"; changeDue: number }
  | { ok: false; code: "INVALID_REQUEST"; message: string };

/** `at` is the time in ms. `customerId` is null when the request has no valid one. */
export type LogEvent = { at: number; customerId: string | null; result: PurchaseResult };

export type MachineSnapshot = {
  changeSupply: ChangeSupply;
  changeSupplyTotal: number;
  cashBox: number;
  log: LogEvent[];
};

export type VendingMachine = {
  /** `now` is the time in ms. A refusal adds a log event and changes nothing else. */
  purchase(request: PurchaseRequest, now: number): PurchaseResult;
  getSnapshot(): MachineSnapshot;
  /** Puts back the starting float and empties the cash box and the log. */
  reset(): void;
};

export const FLOAT_PER_COIN = 10;
const LOG_SIZE = 8;

function startingFloat(): ChangeSupply {
  return Object.fromEntries(DENOMINATIONS.map((coin) => [coin, FLOAT_PER_COIN])) as ChangeSupply;
}

function totalOf(supply: ChangeSupply): number {
  return DENOMINATIONS.reduce((total, coin) => total + coin * supply[coin], 0);
}

const isWholePence = (value: unknown): value is number => Number.isSafeInteger(value);

// The API passes any JSON body, so check each field before use.
function customerProblem(request: unknown): string | null {
  const { customerId } = (request ?? {}) as Partial<Record<keyof PurchaseRequest, unknown>>;
  if (typeof customerId !== "string" || customerId.trim() === "") return "customerId must be a non-empty string.";
  return null;
}

function moneyProblem({ price, amountPaid }: PurchaseRequest): string | null {
  if (!isWholePence(price) || price <= 0) return "price must be a positive whole number of pence.";
  if (!isWholePence(amountPaid) || amountPaid < 0) return "amountPaid must be a whole number of pence, 0 or more.";
  return null;
}

export function createVendingMachine(): VendingMachine {
  const changeSupply = startingFloat();
  let cashBox = 0;
  const log: LogEvent[] = [];

  function sell(request: PurchaseRequest): PurchaseResult {
    const invalid = customerProblem(request) ?? moneyProblem(request);
    if (invalid) return { ok: false, code: "INVALID_REQUEST", message: invalid };

    const { price, amountPaid } = request;
    if (amountPaid < price) return { ok: false, code: "INSUFFICIENT_PAYMENT", shortfall: price - amountPaid };

    const changeDue = amountPaid - price;
    // Check the total first. makeChange() makes a table as large as the amount.
    const change = changeDue <= totalOf(changeSupply) ? makeChange(changeDue, changeSupply) : null;
    if (!change) return { ok: false, code: "CANNOT_MAKE_CHANGE", changeDue };

    for (const coin of change) changeSupply[coin] -= 1;
    cashBox += amountPaid;
    return { ok: true, change, changeTotal: changeDue };
  }

  return {
    purchase(request, now) {
      const result = sell(request);
      const customerId = customerProblem(request) ? null : request.customerId;
      log.unshift({ at: now, customerId, result });
      log.length = Math.min(log.length, LOG_SIZE);
      return result;
    },

    getSnapshot() {
      return {
        changeSupply: { ...changeSupply },
        changeSupplyTotal: totalOf(changeSupply),
        cashBox,
        log: structuredClone(log),
      };
    },

    reset() {
      Object.assign(changeSupply, startingFloat());
      cashBox = 0;
      log.length = 0;
    },
  };
}
