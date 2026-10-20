import type { ChangeSupply, Denomination } from "./vending-machine";

/**
 * Returns the fewest coins from `supply` that make `amount`, largest first, or null.
 * On a tie, it uses more of the larger coins.
 */
export function makeChange(
  amount: number,
  supply: ChangeSupply,
): Denomination[] | null {
  // Sort the coins from smallest to largest
  const coins = (Object.keys(supply).map(Number) as Denomination[]).sort(
    (a, b) => a - b,
  );
  // fewest[a] is the fewest coins that make `a` from the coins so far.
  let fewest = Array.from({ length: amount + 1 }, (_, a) =>
    a === 0 ? 0 : Infinity,
  );
  // used[i][a] is the number of coins[i] in that answer.
  const used: number[][] = [];

  for (const coin of coins) {
    const nextFewest = new Array<number>(amount + 1).fill(Infinity);
    const nextUsed = new Array<number>(amount + 1).fill(0);
    for (let a = 0; a <= amount; a++) {
      // k is the number of coins of this denomination to use.
      // k cannot be more than the machine holds of this coin
      // k lots of the coin cannot exceed the amount to make
      for (let k = 0; k <= supply[coin] && k * coin <= a; k++) {
        const total = fewest[a - k * coin] + k;
        // "<=" keeps the larger k, because this coin is the largest so far.
        if (total !== Infinity && total <= nextFewest[a]) {
          nextFewest[a] = total;
          nextUsed[a] = k;
        }
      }
    }
    fewest = nextFewest;
    used.push(nextUsed);
  }

  if (fewest[amount] === Infinity) return null;

  const change: Denomination[] = [];
  let rest = amount;
  for (let i = coins.length - 1; i >= 0; i--) {
    const k = used[i][rest];
    for (let j = 0; j < k; j++) change.push(coins[i]);
    rest -= k * coins[i];
  }
  return change;
}
