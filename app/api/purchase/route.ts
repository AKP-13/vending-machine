import { machine } from "@/lib/machine";
import type { PurchaseResult } from "@/lib/vending-machine";

function statusOf(result: PurchaseResult): number {
  if (result.ok) return 200;
  if (result.code === "INVALID_REQUEST") return 400;
  if (result.code === "RATE_LIMITED") return 429;
  return 422;
}

export async function POST(request: Request) {
  // Bad JSON becomes null, which the machine refuses as INVALID_REQUEST.
  const body = await request.json().catch(() => null);
  const result = machine.purchase(body, Date.now());
  return Response.json({ result, machine: machine.getSnapshot() }, { status: statusOf(result) });
}
