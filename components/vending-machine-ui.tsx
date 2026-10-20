"use client";

import { useRef, useState } from "react";
import { Coin, isNote } from "@/components/coin";
import { ServicePanel } from "@/components/service-panel";
import { CATALOGUE, CUSTOMERS, PAYMENT_VALUES, type Customer, type Product } from "@/lib/catalogue";
import { formatPence } from "@/lib/money";
import type { MachineSnapshot, PurchaseRequest, PurchaseResult } from "@/lib/vending-machine";

type Refusal = Extract<PurchaseResult, { ok: false }>;

/** The result of a Buy. `tray` holds the change, or the returned money after a refusal. */
type Outcome = { title: string; message: string; paid: number; tray: number[] } & ({ ok: true; item: Product } | { ok: false });

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

async function postPurchase(request: PurchaseRequest) {
  const response = await fetch("/api/purchase", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return (await response.json()) as { result: PurchaseResult; machine: MachineSnapshot };
}

function refusalText(result: Refusal, product: Product, paid: number): { title: string; message: string } {
  switch (result.code) {
    case "INSUFFICIENT_PAYMENT":
      return {
        title: "Not enough money",
        message: `You paid ${formatPence(paid)}. This costs ${formatPence(product.price)}. Add ${formatPence(result.shortfall)}.`,
      };
    case "CANNOT_MAKE_CHANGE":
      return {
        title: "No change available",
        message: `The machine cannot make ${formatPence(result.changeDue)} in change. Your ${formatPence(paid)} was returned. Try exact money.`,
      };
    case "RATE_LIMITED":
      // Round up, so the wait never shows as 0.0s.
      return { title: "Too fast", message: `Too many purchases. Try again in ${(Math.ceil(result.retryAfterMs / 100) / 10).toFixed(1)}s.` };
    case "INVALID_REQUEST":
      return { title: "Not sold", message: result.message };
  }
}

function toOutcome(result: PurchaseResult, product: Product, inserted: number[]): Outcome {
  const paid = sum(inserted);
  if (!result.ok) return { ok: false, ...refusalText(result, product, paid), paid, tray: inserted };

  const { change, changeTotal } = result;
  const message =
    change.length === 0
      ? "Exact money. No change."
      : `Change: ${formatPence(changeTotal)} in ${change.length} coin${change.length > 1 ? "s" : ""}.`;
  return { ok: true, title: `Enjoy your ${product.name}`, message, paid, tray: change, item: product };
}

function hintFor(product: Product | null, credit: number, outcome: Outcome | null): string {
  if (outcome?.ok) return `Price ${formatPence(outcome.item.price)} · change ${formatPence(sum(outcome.tray))}`;
  if (outcome) return "Your money is in the change tray";
  if (!product) return "Choose an item";
  if (credit < product.price) return `Add ${formatPence(product.price - credit)} more`;
  return credit === product.price ? "Exact money" : `Change due: ${formatPence(credit - product.price)}`;
}

const TRAY =
  "flex min-h-20 flex-wrap items-center justify-center gap-1 rounded-[20px] bg-[#070a12] p-2 text-[11px] tracking-[.2em] text-[#3c4660] uppercase shadow-[inset_0_8px_16px_rgba(0,0,0,.6)]";

export function VendingMachineUI({ initialSnapshot }: { initialSnapshot: MachineSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [resetting, setResetting] = useState(false);
  const [firing, setFiring] = useState(false);
  const lastRun = useRef(0);
  const [customer, setCustomer] = useState<Customer>(CUSTOMERS[0]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [inserted, setInserted] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  // After a result, the screen locks until "New purchase" or a new product.
  const locked = outcome !== null;
  const credit = outcome ? outcome.paid : sum(inserted);
  const progress = selected ? Math.min(100, (credit / selected.price) * 100) : 0;

  function select(product: Product) {
    setSelected(product);
    setOutcome(null);
  }

  function insert(value: number) {
    setInserted((coins) => [...coins, value]);
  }

  function cancel() {
    setInserted([]);
  }

  function newPurchase() {
    setOutcome(null);
  }

  async function buy() {
    if (!selected) return;
    const paid = sum(inserted);
    setBusy(true);
    try {
      const { result, machine } = await postPurchase({ customerId: customer.id, price: selected.price, amountPaid: paid });
      setOutcome(toOutcome(result, selected, inserted));
      setSnapshot(machine);
    } catch {
      setOutcome({
        ok: false,
        title: "No answer",
        message: `The machine did not answer. Your ${formatPence(paid)} was returned.`,
        paid,
        tray: inserted,
      });
    } finally {
      setInserted([]);
      setBusy(false);
    }
  }

  async function showSnapshot(request: Promise<Response>) {
    try {
      const response = await request;
      if (response.ok) setSnapshot((await response.json()) as MachineSnapshot);
    } catch {
      // The panel keeps the last snapshot.
    }
  }

  async function rapidFire() {
    if (!selected) return;
    // Other visitors share the log, so continue after the highest run in it.
    const run = Math.max(lastRun.current, ...snapshot.log.map((event) => event.rapidFire?.run ?? 0)) + 1;
    lastRun.current = run;
    setFiring(true);
    await Promise.allSettled(
      [1, 2, 3, 4].map((shot) =>
        postPurchase({ customerId: customer.id, price: selected.price, amountPaid: selected.price, rapidFire: { run, shot } }),
      ),
    );
    // The four answers arrive in any order, so read the state after the last one.
    await showSnapshot(fetch("/api/machine", { cache: "no-store" }));
    setFiring(false);
  }

  async function resetMachine() {
    setResetting(true);
    await showSnapshot(fetch("/api/reset", { method: "POST" }));
    setResetting(false);
  }

  return (
    <main className="flex flex-wrap items-start justify-center gap-6 px-4 py-8">
      <div className="grid w-full max-w-[780px] gap-4 rounded-[36px] border border-white/8 bg-[linear-gradient(160deg,#222b3d,#121826)] p-[18px] shadow-[0_40px_80px_rgba(0,0,0,.55),inset_0_1px_0_rgba(255,255,255,.08)] md:grid-cols-[1fr_260px]">
        <section
          aria-label="Products"
          className="grid grid-cols-3 gap-2.5 self-start rounded-3xl border border-white/8 bg-[linear-gradient(180deg,rgba(120,160,255,.08),rgba(120,160,255,.02))] p-3.5"
        >
          {CATALOGUE.map((product) => {
            const isSelected = selected?.code === product.code;
            return (
              <button
                key={product.code}
                type="button"
                aria-label={`${product.code} ${product.name}, ${formatPence(product.price)}`}
                aria-pressed={isSelected}
                onClick={() => select(product)}
                className={`grid cursor-pointer justify-items-center gap-1.5 rounded-2xl border bg-white/4 px-2.5 pt-3.5 pb-2.5 transition hover:bg-white/8 ${
                  isSelected ? "border-mint shadow-[0_0_0_3px_rgba(124,242,176,.2)]" : "border-white/6"
                }`}
              >
                <span className="text-[40px] leading-none" aria-hidden>
                  {product.emoji}
                </span>
                <small className="text-center text-xs text-muted">{product.name}</small>
                <span className="flex gap-1.5 text-xs">
                  <span className="rounded-full bg-white/8 px-2 py-0.5">{product.code}</span>
                  <b className="rounded-full bg-mint px-2 py-0.5 text-[#062]">{formatPence(product.price)}</b>
                </span>
              </button>
            );
          })}
        </section>

        <section aria-label="Screen" className="flex flex-col gap-3 rounded-[22px] border border-white/6 bg-[#0a0f1c] p-4">
          <div role="radiogroup" aria-labelledby="buying-as" className="flex items-center gap-2">
            <span id="buying-as" className="mr-auto text-[11px] tracking-[.1em] text-[#6c7894] uppercase">
              Buying as
            </span>
            {CUSTOMERS.map((option) => (
              <label key={option.id} title={option.name} className="cursor-pointer">
                <input
                  type="radio"
                  name="customer"
                  value={option.id}
                  checked={customer.id === option.id}
                  onChange={() => setCustomer(option)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  style={{ background: option.color }}
                  className="grid size-8 place-items-center rounded-full text-[13px] font-bold text-white opacity-45 transition peer-checked:opacity-100 peer-checked:shadow-[0_0_0_2px_#0a0f1c,0_0_0_4px_#7cf2b0] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-white"
                >
                  {option.name[0]}
                </span>
                <span className="sr-only">{option.name}</span>
              </label>
            ))}
          </div>

          <div className="text-[13px] text-muted">
            {selected ? (
              <>
                {selected.code} · {formatPence(selected.price)}
                <b className="block text-lg text-white">{selected.name}</b>
              </>
            ) : (
              <b className="block text-lg text-white">Choose an item</b>
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-muted">{outcome ? (outcome.ok ? "Paid" : "Returned") : "Paying"}</span>
            <b className={`text-[34px] tracking-tight tabular-nums ${locked ? "text-muted" : ""}`}>{formatPence(credit)}</b>
          </div>

          <div>
            <div
              role="progressbar"
              aria-label="Amount paid towards the price"
              aria-valuenow={Math.round(progress)}
              className="h-1.5 overflow-hidden rounded-[3px] bg-white/8"
            >
              <i className="block h-full bg-mint transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">{hintFor(selected, credit, outcome)}</p>
          </div>

          <div className={`grid grid-cols-4 justify-items-center gap-2 ${locked ? "opacity-30" : ""}`}>
            {PAYMENT_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Insert ${formatPence(value)}`}
                onClick={() => insert(value)}
                disabled={busy || locked}
                className={`cursor-pointer transition-transform disabled:cursor-not-allowed active:translate-y-0.5 active:scale-95 ${isNote(value) ? "col-span-2" : ""}`}
              >
                <Coin value={value} />
              </button>
            ))}
          </div>

          {locked ? (
            <button
              type="button"
              onClick={newPurchase}
              className="cursor-pointer rounded-[14px] bg-white p-[13px] font-bold text-[#0a0f1c]"
            >
              New purchase
            </button>
          ) : (
            <div className="grid grid-cols-[2fr_1fr] gap-2">
              <button
                type="button"
                onClick={buy}
                disabled={!selected || busy}
                className="cursor-pointer rounded-[14px] bg-mint p-[13px] font-bold text-[#052] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Buy
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={busy}
                className="cursor-pointer rounded-[14px] bg-white/8 p-[13px] font-bold"
              >
                Cancel
              </button>
            </div>
          )}

          <div role="status">
            {outcome && (
              <div
                className={`rounded-[14px] p-3 text-[13px] ${
                  outcome.ok ? "bg-mint/12 text-[#a9f7cc]" : "bg-[#ff6b5e]/12 text-[#ffb1a8]"
                }`}
              >
                <b className="mb-1 block text-sm">{outcome.title}</b>
                {outcome.message}
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-4 md:col-span-2 md:grid-cols-[1fr_260px]">
          <section aria-label="Collection tray" className={TRAY}>
            {outcome?.ok ? (
              <span className="text-[40px] leading-none" role="img" aria-label={outcome.item.name}>
                {outcome.item.emoji}
              </span>
            ) : (
              "Collect item"
            )}
          </section>
          <section aria-label="Change tray" className={TRAY}>
            {outcome && outcome.tray.length > 0
              ? outcome.tray.map((value, index) => <Coin key={index} value={value} size={28} />)
              : "Change"}
          </section>
        </div>
      </div>

      <ServicePanel
        snapshot={snapshot}
        onReset={resetMachine}
        resetting={resetting}
        rapidFire={selected && { customer, product: selected }}
        onRapidFire={rapidFire}
        firing={firing}
      />
    </main>
  );
}
