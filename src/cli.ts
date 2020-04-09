#!/usr/bin/node
import { Command, program } from "commander";
import { getPackageInfo } from "/src/utils";
import commands, { CommandInterface } from "./commands";

interface InitArgs {
  verbosity: number;
  devMode: boolean;
}

function createProgram(
  {
    name,
    version,
    description,
  }: {
    name?: string;
    version?: string;
    description?: string;
  },
  commandInterface: CommandInterface = commands
): typeof program {
  const program = new Command(name);

  program.storeOptionsAsProperties(false).passCommandToAction(false);

  if (version) {
    program.version(version);
  }

  if (description) {
    program.description(description);
  }

  // program.option(
  //   "-v, --verbose",
  //   "increase verbosity",
  //   (dummyValue, previous) => previous + 1,
  //   0
  // );

  commandInterface(program as Command);

  return program;
}

if (process.argv) {
  createProgram(getPackageInfo())
    .parseAsync(process.argv)
    .catch((error) => {
      console.error(
        `Failed with an unhandled exception: ${error.stack || error}`
      );
      process.exit(1);
    });
}
