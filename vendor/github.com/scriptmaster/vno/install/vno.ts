import { build, create, flags, run } from "../core/cli/commands.ts";
import { cmnd } from "../core/cli/constants.ts";
import { generate } from "../core/ssg/generate.ts";
import { startDev } from "../core/ssg/dev.ts";

//this is how you pass command line arguments to Deno, every space is an index of an array of args
const { args } = Deno;
const command = args[0];

if (cmnd.help.test(command) || cmnd.info.test(command)) flags(args);

// ensure permissions
const read = { name: "read" } as const;
const write = { name: "write" } as const;
const runPerm = { name: "run" } as const;

// permission requests
const resRead = await Deno.permissions.request(read);
const resWrite = await Deno.permissions.request(write);

// function to test the command in the command line
main();

//   if (cmnd.dev.test(command)) {
//     const resRun = await Deno.permissions.request(run);
//     if(resRun) await dev(args);
// }

async function main() {
  if (resRead && resWrite) {
    if (cmnd.create.test(command)) await create(args);
    if (command === "ssg") {
      if (args[1] === "build") return generate("production");
      if (args[1] === "dev") return startDev();
    }
    if (cmnd.build.test(command)) await build(args);
    if (cmnd.run.test(command)) {
      const resRun = await Deno.permissions.request(runPerm);
      if (resRun) await run(args);
    }
  }
}

// VNO BUILD SSG
// execute generate
