import { machine } from "@/lib/machine";

export async function POST() {
  machine.reset();
  return Response.json(machine.getSnapshot());
}
