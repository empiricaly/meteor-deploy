import { Command } from "commander";
import init from "./init";
import stack from "./stack";
import install from "./install";
import { getHelperExecutables } from "/src/helper-programs";

export interface CommandInterface {
  (program: Command): void | Promise<void>;
}

export async function addSubcommands(
  program: Command,
  subCommands: Record<string, CommandInterface>
): Promise<void> {
  await Promise.all(
    Object.entries(subCommands).map(async ([name, subCommand]) => {
      const command = program.command(name);
      await subCommand(command as Command);
    })
  );
}

export default async function (program: Command): Promise<void> {
  await addSubcommands(program, {
    init,
    stack,
    install,
  });

  getHelperExecutables().forEach(({ name, executableFile }) =>
    program.command(name, `Run ${name}`, { executableFile })
  );
}
