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

function Total({ label, pence }: { label: string; pence: number }) {
  return (
    <div className="rounded-[10px] bg-white/5 p-2.5">
      <dt className="text-[11px] opacity-70">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{formatPence(pence)}</dd>
    </div>
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
  return (
    <aside
      aria-label="Service panel"
      className="w-full max-w-[780px] rounded-3xl border border-white/8 bg-white/4 p-[18px] backdrop-blur-[10px] min-[1120px]:w-[270px]"
    >
      <h2 className="mb-3 text-[13px] tracking-[.08em] text-[#6c7894] uppercase">Service panel</h2>

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
              <span className={`text-right ${empty ? "font-bold text-[#e5484d]" : ""}`}>
                {empty ? "Empty" : `${count}×`}
              </span>
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
  );
}
