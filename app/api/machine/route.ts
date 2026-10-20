import { connection } from "next/server";
import { machine } from "@/lib/machine";

export async function GET() {
  // The snapshot changes after each sale, so do not prerender it at build time.
  await connection();
  return Response.json(machine.getSnapshot());
}
