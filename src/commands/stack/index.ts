import { Command } from "commander";

import configure from "./configure";
import { addSubcommands } from "/src/commands";

export default async function (program: Command) {
  await addSubcommands(program, {
    configure,
  });
}
