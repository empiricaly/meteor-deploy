import { Command } from "commander";
import { commonOptions } from "./common-options";
import { PulumiProjectInitializer, ExecutionReporter } from "/src/initializers";
import { requireNoFailures } from "/src/initializers/utils";

export default function (program: Command): void {
  program.arguments("[projectName]");
  program.description(
    "Initialize a deployment project in the current directory"
  );

  const getOptions = commonOptions(
    program,
    "simulation",
    "meteorDirectory",
    "developmentMode"
  );

  program.option(
    "--description <string>",
    "The description of the deployment project."
  );

  program.action(async (projectName?: string) => {
    const { description } = program.opts();
    const { meteorDirectory, simulation, developmentMode } = getOptions();

    const initializer = PulumiProjectInitializer.create(simulation).addProject({
      projectName,
      meteorDirectory,
      description,
      developmentMode,
    });

    const reporter = new ExecutionReporter();

    reporter.enable(initializer);

    const results = await initializer.execute();
    reporter.disable(initializer);

    requireNoFailures(results);
  });
}
