import { connection } from "next/server";
import { Suspense } from "react";
import { VendingMachineUI } from "@/components/vending-machine-ui";
import { machine } from "@/lib/machine";

async function Machine() {
  // All visitors share one machine, so read it for each request.
  await connection();
  return <VendingMachineUI initialSnapshot={machine.getSnapshot()} />;
}

export default function Home() {
  return (
    <Suspense>
      <Machine />
    </Suspense>
  );
}
