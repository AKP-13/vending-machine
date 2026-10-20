import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import { Coin } from "@/components/coin";
import { customerName, type Customer, type Product } from "@/lib/catalogue";
import { formatPence } from "@/lib/money";
import { DENOMINATIONS, FLOAT_PER_COIN, type LogEvent, type MachineSnapshot } from "@/lib/vending-machine";

// Use a fixed time zone, so the server and the browser show the same text.
const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Europe/London",
});

function describe({ customerId, rapidFire, result }: LogEvent): string {
  const customer = customerId === null ? "Unknown customer" : customerName(customerId);
  if (rapidFire) return `${customer} run ${rapidFire.run} #${rapidFire.shot} · ${result.ok ? "sold" : result.code}`;
  if (!result.ok) return `${customer} refused · ${result.code}`;
  return `${customer} bought · ${result.changeTotal ? `change ${formatPence(result.changeTotal)}` : "exact money"}`;
}

/** Counts the changes to `value`. Use it as a key, so a new element replays the flash. */
function useChangeCount(value: number): number {
  const [previous, setPrevious] = useState(value);
  const [count, setCount] = useState(0);
  if (value !== previous) {
    setPrevious(value);
    setCount(count + 1);
  }
  return count;
}

// Tailwind's md breakpoint: the md: classes undo the drawer.
const NARROW_QUERY = "(max-width: 767px)";

function subscribeNarrow(onChange: () => void) {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True on a phone, where the service panel is a drawer. The server renders the wide layout. */
function useNarrowScreen(): boolean {
  return useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW_QUERY).matches, () => false);
}

function Total({ label, pence }: { label: string; pence: number }) {
  const changes = useChangeCount(pence);
  return (
    <div key={changes} className={`rounded-[10px] bg-white/5 p-2.5 ${changes ? "flash" : ""}`}>
      <dt className="text-[11px] opacity-70">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{formatPence(pence)}</dd>
    </div>
  );
}

function CoinCount({ count }: { count: number }) {
  const changes = useChangeCount(count);
  const empty = count === 0;
  return (
    <span
      key={changes}
      className={`rounded px-1 text-right ${empty ? "font-bold text-[#e5484d]" : ""} ${changes ? "flash" : ""}`}
    >
      {empty ? "Empty" : `${count}×`}
    </span>
  );
}

export function ServicePanel({
  snapshot,
  onReset,
  resetting,
  rapidFire,
  onRapidFire,
  firing,
}: {
  snapshot: MachineSnapshot;
  onReset: () => void;
  resetting: boolean;
  /** What a rapid fire run buys, or null before the customer selects a product. */
  rapidFire: { customer: Customer; product: Product } | null;
  onRapidFire: () => void;
  firing: boolean;
}) {
  const narrow = useNarrowScreen();
  const [open, setOpen] = useState(false);
  const openButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  // A wide screen has no drawer, so the drawer does not open again when the screen becomes narrow.
  if (open && !narrow) setOpen(false);

  function closeDrawer() {
    setOpen(false);
    openButton.current?.focus();
  }

  // The open drawer is modal: Escape closes it, and Tab stays inside it.
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") return closeDrawer();
    if (event.key !== "Tab" || !panel.current) return;
    const buttons = panel.current.querySelectorAll<HTMLElement>("button:not(:disabled)");
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (document.activeElement === (event.shiftKey ? first : last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={openButton}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="service-panel"
        className="fixed inset-x-4 bottom-4 z-10 flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-[#121826] px-4 py-3 text-[13px] font-semibold shadow-[0_10px_30px_rgba(0,0,0,.5)] md:hidden"
      >
        Service panel
        <span className="text-muted tabular-nums">
          Cash box {formatPence(snapshot.cashBox)} <span aria-hidden>▴</span>
        </span>
      </button>

      {open && <div aria-hidden className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={closeDrawer} />}

      <aside
        ref={panel}
        id="service-panel"
        aria-label="Service panel"
        // On a phone the panel is a bottom drawer. From md it sits in the page.
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        inert={narrow && !open}
        className={`fixed inset-x-0 bottom-0 z-30 max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border border-white/8 bg-[#121826] p-[18px] transition-transform duration-300 motion-reduce:transition-none md:static md:z-auto md:max-h-none md:max-w-[780px] md:translate-y-0 md:overflow-visible md:rounded-3xl md:bg-white/4 md:backdrop-blur-[10px] md:transition-none min-[1120px]:w-[270px] ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] tracking-[.08em] text-[#6c7894] uppercase">Service panel</h2>
          <button
            ref={closeButton}
            type="button"
            onClick={closeDrawer}
            className="cursor-pointer rounded-lg bg-white/8 px-2.5 py-1 text-xs font-semibold md:hidden"
          >
            Close
          </button>
        </div>

        <dl className="mb-3.5 grid grid-cols-2 gap-2">
          <Total label="Change supply" pence={snapshot.changeSupplyTotal} />
          <Total label="Cash box" pence={snapshot.cashBox} />
        </dl>

        <ul aria-label="Change supply by coin" className="grid gap-2.5">
          {DENOMINATIONS.map((coin) => {
            const count = snapshot.changeSupply[coin];
            const empty = count === 0;
            return (
              <li
                key={coin}
                className={`grid grid-cols-[26px_1fr_44px] items-center gap-2 text-xs tabular-nums ${empty ? "opacity-45" : ""}`}
              >
                <Coin value={coin} size={22} />
                <div className="h-1.5 overflow-hidden rounded-[3px] bg-white/8">
                  <i
                    className="block h-full rounded-[3px] bg-[linear-gradient(90deg,#4cc9f0,#7cf2b0)]"
                    style={{ width: `${Math.min(100, (count / FLOAT_PER_COIN) * 100)}%` }}
                  />
                </div>
                <CoinCount count={count} />
              </li>
            );
          })}
        </ul>

        <ol aria-label="Event log" className="mt-3 grid gap-1 text-[11.5px]">
          {snapshot.log.length === 0 && <li className="text-muted">No events yet.</li>}
          {snapshot.log.map((event, index) => (
            <li key={`${event.at}-${index}`} className={event.result.ok ? "text-[#30a46c]" : "text-[#e5484d]"}>
              <time dateTime={new Date(event.at).toISOString()} className="mr-1.5 tabular-nums opacity-55">
                {TIME.format(event.at)}
              </time>
              {event.result.ok ? "✓" : "✕"} {describe(event)}
            </li>
          ))}
        </ol>

        <div className="mt-3 flex gap-1.5">
          <button
            type="button"
            onClick={onReset}
            disabled={resetting}
            className="flex-1 cursor-pointer rounded-lg bg-white/8 p-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset machine
          </button>
          <button
            type="button"
            onClick={onRapidFire}
            disabled={!rapidFire || firing}
            aria-describedby="rapid-fire-hint"
            className="flex-1 cursor-pointer rounded-lg bg-white/8 p-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Rapid fire ×4
          </button>
        </div>
        <p id="rapid-fire-hint" className="mt-2 text-[11px] text-muted">
          {rapidFire
            ? `Rapid fire buys ${rapidFire.product.code} 4 times as ${rapidFire.customer.name}, with exact money.`
            : "Choose an item to use rapid fire."}
        </p>
      </aside>
    </>
  );
}
