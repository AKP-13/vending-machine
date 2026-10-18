"use client";

import { useState } from "react";
import { Coin, isNote } from "@/components/coin";
import { CATALOGUE, PAYMENT_VALUES, type Product } from "@/lib/catalogue";
import { formatPence } from "@/lib/money";
import type { PurchaseResult } from "@/lib/vending-machine";

// Ticket 04 adds the customer selector.
const CUSTOMER_ID = "ada";

type Outcome = { title: string; message: string; ok: boolean };

function toOutcome(result: PurchaseResult, product: Product, amountPaid: number): Outcome {
  if (result.ok) return { ok: true, title: `Enjoy your ${product.name}`, message: "Exact money. No change." };
  return { ok: false, title: "Not sold", message: `${result.code}. Your ${formatPence(amountPaid)} was returned.` };
}

export function VendingMachineUI() {
  const [selected, setSelected] = useState<Product | null>(null);
  const [amountPaid, setAmountPaid] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);

  function select(product: Product) {
    setSelected(product);
    setOutcome(null);
  }

  function insert(value: number) {
    setAmountPaid((paid) => paid + value);
    setOutcome(null);
  }

  function cancel() {
    setAmountPaid(0);
    setOutcome(null);
  }

  async function buy() {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: CUSTOMER_ID, price: selected.price, amountPaid }),
      });
      const { result } = (await response.json()) as { result: PurchaseResult };
      setOutcome(toOutcome(result, selected, amountPaid));
    } catch {
      setOutcome({ ok: false, title: "No answer", message: `The machine did not answer. Your ${formatPence(amountPaid)} was returned.` });
    } finally {
      setAmountPaid(0);
      setBusy(false);
    }
  }

  return (
    <main className="flex justify-center px-4 py-8">
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
            <span className="text-[13px] text-muted">Paying</span>
            <b className="text-[34px] tracking-tight tabular-nums">{formatPence(amountPaid)}</b>
          </div>

          <div className="grid grid-cols-4 justify-items-center gap-2">
            {PAYMENT_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Insert ${formatPence(value)}`}
                onClick={() => insert(value)}
                disabled={busy}
                className={`cursor-pointer transition-transform active:translate-y-0.5 active:scale-95 ${isNote(value) ? "col-span-2" : ""}`}
              >
                <Coin value={value} />
              </button>
            ))}
          </div>

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
      </div>
    </main>
  );
}
