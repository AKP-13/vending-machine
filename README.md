# Vending machine

A take-home task for Modo Energy. A customer buys an item with cash, and the machine gives the change in the fewest coins. The machine has a finite supply of coins and nobody refills it.

**Live app:** https://vending-machine-xi-ten.vercel.app/

The app uses Next.js (App Router), TypeScript and Tailwind CSS. Vitest runs the tests. There is no database.

## Run and test

You need Node.js 20.9 or later.

```bash
npm ci
```

```bash
npm run dev
```

Open http://localhost:3000.

```bash
npm test
```

`npm run typecheck` checks the types. `npm run build` makes the production build.

## How it works

All money is integer pence. Only the UI shows £ values.

The machine starts with a float of ten of each UK coin, 1p to £2. That is 10 × 388p = £38.80. The money that a customer inserts goes into a sealed cash box, not into the change supply. Therefore, the machine can run out of a coin and refuse a purchase.

The core is one module, [`lib/vending-machine.ts`](lib/vending-machine.ts). Its interface:

- `purchase(request, now)` returns a typed result. It changes the state only on a success.
- `getSnapshot()` returns the change supply, the totals and the last eight log events.
- `reset()` puts back the float and empties the cash box, the purchase times and the log.

The test seam is `purchase(request, now)`. `createVendingMachine()` makes a new machine for each test, and each test passes a fake `now`. A small number of direct tests check the change maker. The app uses one machine for each server process ([`lib/machine.ts`](lib/machine.ts)).

`purchase()` does the checks in this order:

1. The customer ID. A bad ID gives `INVALID_REQUEST`.
2. The rate limit. After three successful purchases in the last 3 seconds, the next attempt gives `RATE_LIMITED`.
3. The price and the amount paid. A bad value gives `INVALID_REQUEST`.
4. The payment. Too little money gives `INSUFFICIENT_PAYMENT`.
5. The change. If the coins cannot make the change, the result is `CANNOT_MAKE_CHANGE`.

A refusal adds a log event. It does not change the change supply, the cash box or the purchase times.

### API

| Route | Does |
| --- | --- |
| `POST /api/purchase` | The body is `{ customerId, price, amountPaid }`, in pence. Returns `{ result, machine }`. |
| `GET /api/machine` | Returns the machine snapshot. |
| `POST /api/reset` | Resets the machine. Returns the snapshot. |

The status is 200 for a success, 400 for `INVALID_REQUEST`, 422 for `INSUFFICIENT_PAYMENT` and `CANNOT_MAKE_CHANGE`, and 429 for `RATE_LIMITED`.

```bash
curl -X POST http://localhost:3000/api/purchase -H 'Content-Type: application/json' -d '{"customerId":"ada","price":135,"amountPaid":200}'
```

## Interpretations of the brief

- **The price.** The brief says that the customer gives the price. The API accepts the price. The UI takes the price from a fixed catalogue of nine products, so that a customer cannot type any price.
- **The rate limit.** "Three purchases per three seconds" counts successful purchases only, because a refused attempt is not a purchase. Each customer has a separate sliding window. The machine checks the limit before the price, so a rate-limited request with a bad price gives `RATE_LIMITED`.
- **The state.** The state is in the memory of the server, and all visitors share one machine. A page refresh does not reset it. This is correct for a local run. On Vercel, the state resets on a redeploy or when Vercel stops the instance. If Vercel starts a second instance, two visitors can see different machines.

## Why greedy fails

The greedy method takes the largest coin that fits, again and again. The UK coin set is canonical, so the greedy method is optimal when the supply of each coin has no limit. This machine has a finite supply, and then the greedy method can fail.

Take a change supply of one 50p, three 20p and five 2p, and a change due of 60p:

- The greedy method takes the 50p. No 20p fits in the 10p that remains, so it takes five 2p. The result is 6 coins.
- The best answer is three 20p. The result is 3 coins.
- Without the 2p coins, the greedy method refuses the purchase. Three 20p still works.

The change maker ([`lib/change-maker.ts`](lib/change-maker.ts)) is a bounded dynamic program. It finds the fewest coins with the coins that the machine holds. On a tie, it uses the larger coins. The machine checks the total change supply first, so a very large change due does not make a large table.

## How the work used AI

I used Claude Code with [Matt Pocock's skills](https://github.com/mattpocock/skills), in [`.claude/skills`](.claude/skills):

1. **Grill.** A grill session asked me questions about each part of the brief until all the decisions were clear. The interpretations above come from that session.
2. **Prototype.** The `prototype` skill made three visual directions. I chose variant C. It is on the `prototype/visual-direction` branch, in `prototypes/visual-direction.html`.
3. **Spec.** The `to-spec` skill wrote the spec from the grill session. The spec has the user stories, the modules, the order of checks, the API contract and the test plan.
4. **Tickets.** The `to-tickets` skill split the spec into six tickets in a Notion database. Each ticket has acceptance criteria and its blockers.
5. **Build.** For each ticket, the `implement` skill read the ticket from Notion, used `tdd` at the `purchase(request, now)` seam, and ran `code-review` before the commit.

[`CLAUDE.md`](CLAUDE.md) gives the agent the rules: the tracker, the Notion connector, integer pence and the test seam.

## The `two-hour-mark` branch

The brief has a limit of 2 hours. The time for the plan was part of the 2 hours. The `two-hour-mark` branch is the work at the limit, at commit `48fa532`. Nobody commits to it. It has:

- Ticket 01: an exact-money purchase, end to end.
- Ticket 02: change in the fewest coins, the refusals and the locked screen.

The work after the mark, one branch and one pull request for each ticket:

- Ticket 03: the service panel, the event log and "Reset machine".
- Ticket 04: the three customers, the rate limit and "Rapid fire ×4".
- Ticket 05: the drop and coin animations (off with reduced motion), and the service panel as a drawer on a phone.
- Ticket 06: this README and the Vercel deploy.

## Deploy

To deploy, import the GitHub repository in the Vercel dashboard. No Vercel CLI is necessary. Keep the Next.js defaults. Vercel then deploys each push to `main` to production, and each pull request gets a preview deploy.

## With more time

- **Redis** (or another shared store) for the state, so that all Vercel instances share one machine and a redeploy keeps it.
- **The cash box by denomination.** This needs the list of inserted coins in the API. Then the machine could also use the inserted coins as change.
- **A keypad** for the product codes, as on a real machine.
- **End-to-end tests** in a browser, for the UI flow, the locked screen, the drawer and rapid fire.
