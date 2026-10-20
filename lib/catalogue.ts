import { DENOMINATIONS } from "./vending-machine";

// The UI reads the catalogue. The API does not.

export type Product = { code: string; name: string; emoji: string; price: number };

export type Customer = { id: string; name: string; color: string };

export const CUSTOMERS: Customer[] = [
  { id: "ada", name: "Ada", color: "#7c5cff" },
  { id: "ben", name: "Ben", color: "#ff7a59" },
  { id: "cleo", name: "Cleo", color: "#1fb5a5" },
];

/** Shows a preset customer by name, and any other API customer by ID. */
export function customerName(customerId: string): string {
  return CUSTOMERS.find((customer) => customer.id === customerId)?.name ?? customerId;
}

export const CATALOGUE: Product[] = [
  { code: "A1", name: "Sea Salt Crisps", emoji: "🥔", price: 85 },
  { code: "A2", name: "Milk Chocolate", emoji: "🍫", price: 120 },
  { code: "A3", name: "Salted Pretzels", emoji: "🥨", price: 95 },
  { code: "B1", name: "Classic Cola", emoji: "🥤", price: 135 },
  { code: "B2", name: "Still Water", emoji: "💧", price: 65 },
  { code: "B3", name: "Apple Juice", emoji: "🧃", price: 110 },
  { code: "C1", name: "Energy Drink", emoji: "⚡", price: 245 },
  { code: "C2", name: "Choc Chip Cookies", emoji: "🍪", price: 150 },
  { code: "C3", name: "Roasted Peanuts", emoji: "🥜", price: 175 },
];

// The customer can insert UK coins and the £5 and £10 notes.
export const PAYMENT_VALUES = [...DENOMINATIONS, 500, 1000];
