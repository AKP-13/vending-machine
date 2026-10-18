import { formatPence } from "@/lib/money";

export const isNote = (value: number) => value >= 500;

function shapeOf(value: number): string {
  if (isNote(value)) return `note n${value}`;
  if (value <= 2) return "copper";
  if (value === 20 || value === 50) return "silver hept";
  if (value === 100) return "bi dodec";
  if (value === 200) return "bi";
  return "silver";
}

// Relative sizes of the real UK coins.
const SCALE: Record<number, number> = { 1: 0.8, 2: 1, 5: 0.75, 10: 1, 20: 0.9, 50: 0.9, 100: 0.9, 200: 1 };

export function Coin({ value, size = 34 }: { value: number; size?: number }) {
  const width = isNote(value) ? size * 1.5 : size * SCALE[value];
  const height = isNote(value) ? size * 0.8 : width;

  return (
    <span
      className={`coin ${shapeOf(value)}`}
      style={{ width, height, fontSize: Math.max(9, size * 0.3) }}
    >
      {/* A coin shows "£1", not "£1.00". */}
      {formatPence(value).replace(".00", "")}
    </span>
  );
}
