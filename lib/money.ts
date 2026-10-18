/** Shows pence as "35p" below £1 and as "£1.35" from £1. */
export function formatPence(pence: number): string {
  return pence < 100 ? `${pence}p` : `£${(pence / 100).toFixed(2)}`;
}
