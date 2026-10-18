import { createVendingMachine, type VendingMachine } from "./vending-machine";

// Keep one machine per server process, also across dev hot reloads and route bundles.
const store = globalThis as typeof globalThis & { vendingMachine?: VendingMachine };

export const machine = (store.vendingMachine ??= createVendingMachine());
