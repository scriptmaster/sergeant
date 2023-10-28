import { startDev } from "./dev.ts";

if (Deno.args[0] == "-y") {
  startDev();
} else {
  const res = prompt("start the server?:");

  if (res?.startsWith("y")) {
    startDev();
  }
}
