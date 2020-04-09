import { Command } from "commander";
import { commonOptions } from "./common-options";
import { PulumiProjectInitializer, ExecutionReporter } from "/src/initializers";
import { requireNoFailures } from "/src/initializers/utils";

export default function (program: Command): void {
  program.arguments("[directory]");
  program.description("Initialize a deployment project");

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

  program.action(async (deploymentDirectory?: string) => {
    const { description } = program.opts();
    const { meteorDirectory, simulation, developmentMode } = getOptions();

    const initializer = PulumiProjectInitializer.create(simulation).addProject({
      deploymentDirectory,
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
